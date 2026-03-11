const mongoose = require('mongoose');

const MONGODB_URL =
    process.env.MONGODB_URL || 'mongodb://localhost:27017/voting_system';

async function connectDatabase() {
    await mongoose.connect(MONGODB_URL, {
        maxPoolSize: 10,                // max connections per PM2 instance
        serverSelectionTimeoutMS: 5000, 
    });
    console.log(`DB connected (PID: ${process.pid}, url: ${MONGODB_URL})`);
}

module.exports = connectDatabase;
