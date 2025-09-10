const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    conversationId: {
        type: String,
    },
    senderId: {
        type: String,

    },
    receiverId: {
        type: String,
    },
    message: {
        type: String,
    },
    createdAt: { // Add createdAt field
        type: Date,
        default: Date.now
    }
},
    { timestamps: true }
);

const Messages = mongoose.model('Messages', messageSchema);

module.exports = Messages;