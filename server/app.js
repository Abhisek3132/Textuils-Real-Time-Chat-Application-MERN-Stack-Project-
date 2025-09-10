const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const moment = require('moment'); // Import moment
const io = require('socket.io')(8080, {
    cors: {
        origin: 'http://localhost:3000',
    }
});

const app = express();
// Connect DB
require('./db/connection');

// Import User model
const Users = require('./models/Users');
const Conversations = require('./models/Conversations');
const Messages = require('./models/Messages');

// App use
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const port = process.env.PORT || 8000;

// Socket.io connection
let users = [];
io.on('connection', socket => {
    console.log('A user connected:', socket.id);
    socket.on('addUser', userId => {
        const isUserExist = users.find(user => user.userId === userId);
        if (!isUserExist) {
        const user = { userId, socketId: socket.id };
        users.push(user);
        io.emit('getUsers', users);
        }

    });
    // filepath: d:\Work 2\server\app.js
    socket.on('sendMessage', async ({ senderId, receiverId, message, conversationId, timestamp }) => {
        const receiver = users.find(user => user.userId === receiverId);
        const sender = users.find(user => user.userId === senderId);
        const user = await Users.findById(senderId);

        if (sender) { // Check if sender exists
            if (receiver) {
                io.to(receiver.socketId).to(sender.socketId).emit('getMessage', {
                    senderId,
                    message,
                    conversationId,
                    receiverId,
                    user: { id: user._id, username: user.username, email: user.email },
                    timestamp
                });
                // Save message to database
            } else {
                io.to(sender.socketId).emit('getMessage', {
                    senderId,
                    message,
                    conversationId,
                    receiverId,
                    user: { id: user._id, username: user.username, email: user.email },
                    timestamp
                });
            }
        } else {
            console.log(`Sender with userId ${senderId} not found in active users.`);
            // Optionally emit an error message back to the sender
        }
    });

    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id);
        io.emit('getUsers', users);
        console.log('A user disconnected:', socket.id);
    });
    // io.emit('getUsers', socket.userId); 
});

//Routes
app.get('/', (req, res) => {
    res.send('Welcome');
});
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).send('Please fill all required blanks');
        }
        const isAlreadyexist = await Users.findOne({ email });
        if (isAlreadyexist) {
            return res.status(400).send({ error: 'User already exists' });
        }
        const hashedPassword = await bcryptjs.hash(password, 10);
        const newUser = new Users({ username, email, password: hashedPassword });
        await newUser.save();
        return res.status(200).json('User registered successfully');
    } catch (error) {
        return res.status(500).send({ error: 'Internal server error' });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send('Please fill all required blanks');
        }else {
            const user = await Users.findOne({ email });   
            if (!user) {
                return res.status(400).send({ error: 'User email or password is incorrect' });
            } else {
                const validateUser = await bcryptjs.compare(password, user.password);
                if (!validateUser) {
                    return res.status(400).send({ error: 'User email or password is incorrect' });
                } else {
                    const payload = {
                        userId: user._id,
                        username: user.username,
                        email: user.email
                    }
                    const JWT_SECRET_KEY = process.env.JWT_SECRET || 'THIS_IS_A_JWT_SECRET_KEY';
                    jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, async (err, token) => {
                        await Users.updateOne({ _id: user._id }, {
                            $set: { token }
                        });
                        user.save();
                        // next();
                    return res.status(200).json({ user:{id: user._id, email:user.email, username:user.username},token: token});

                    });

                }
            }
        }
    } catch (error) {
        console.error(error);
    }
})
app.post('/api/conversation', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const newConversation = new Conversations({
            members: [senderId, receiverId]});
        await newConversation.save();
        res.status(200).send('Conversation created successfully');
    } catch (error) {
        console.log('Error creating conversation:', error);
    }
})

app.post('/api/message', async (req, res) => {
    try {
        const { senderId, message, receiverId, timestamp } = req.body;
        let { conversationId } = req.body; // Declare conversationId with let
        if (!senderId || !message || !receiverId) return res.status(400).send('Please fill all required blanks');

        let existingConversation;

        if (conversationId === 'new') {
            // Check if a conversation already exists between the sender and receiver
            existingConversation = await Conversations.findOne({
                members: { $all: [senderId, receiverId] }
            });

            if (existingConversation) {
                // Use the existing conversation's ID
                conversationId = existingConversation._id;
            } else {
                // Create a new conversation
                const newConversation = new Conversations({
                    members: [senderId, receiverId]
                });
                await newConversation.save();
                conversationId = newConversation._id;
            }
        }

        const newMessage = new Messages({
            conversationId,
            senderId,
            message,
            createdAt: timestamp
        });
        await newMessage.save();
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

app.get('/api/conversation/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const conversations = await Conversations.find({ members: { $in: [userId] } });

        // Filter out duplicate conversations
        const uniqueConversations = [];
        const conversationIds = new Set();

        for (const conversation of conversations) {
            const conversationId = conversation._id.toString();
            if (!conversationIds.has(conversationId)) {
                uniqueConversations.push(conversation);
                conversationIds.add(conversationId);
            }
        }

        const conversationUserData = Promise.all(
            uniqueConversations.map(async (conversation) => {
                const receiverId = conversation.members.find((member) => member !== userId);
                const user = await Users.findById(receiverId);
                return {
                    user: {
                        receiverId: user._id,
                        username: user.username,
                        email: user.email,
                        _id: user._id
                    },
                    conversationId: conversation._id.toString()
                };
            })
        );
        res.status(200).json(await conversationUserData);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/api/message/:conversationId', async (req, res) => {
  try {
    const checkMessages = async (conversationId) => {
         const messages = await Messages.find({ conversationId }).sort({ createdAt: 1 });
    const messageUserData = Promise.all(
      messages.map(async (message) => {
        const user = await Users.findById(message.senderId);
          return {
            user: {
                id: user._id,
              username: user.username,
              email: user.email
            },
            message: message.message,
            createdAt: message.createdAt
          };
          })
        ); 
            res.status(200).json( await messageUserData);
    }
   const conversationId = req.params.conversationId;
    if (conversationId === 'new') {
        const checkConversation = await Conversations.find({ members: { $all: [req.query.senderId, req.query.receiverId] } });
        if(checkConversation.length > 0) {
            checkMessages(checkConversation[0]._id);
        } else {
            return res.status(200).json([]);
        }

    } else {
        checkMessages(conversationId);
    }
    
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
});

app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const users = await Users.find({ _id: { $ne: userId } });
        const usersData = Promise.all(
            users.map(async (user) => {
                return {
                    user:{
                    username: user.username,
                    email: user.email, receiverId: user._id},
                    
                };
            })
        );
        res.status(200).json(await usersData);
    }
    catch (error) {
        console.error('Error', error);
    }
});

app.listen(port, () => {
    console.log('listening on port: ' + port);
});
