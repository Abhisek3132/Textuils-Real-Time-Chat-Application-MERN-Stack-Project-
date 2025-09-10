const mongoose = require('mongoose');

const url = `mongodb+srv://chat_app_admin:admin1234@cluster0.pamb9fw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() =>
    console.log('Connected to MongoDB')).catch((e)=> console.log('Error connecting to MongoDB:', e));