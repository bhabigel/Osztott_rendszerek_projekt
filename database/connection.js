const mongoose = require('mongoose');
const pool = require('./mysql/pool');

const MONGODB_URL =
    process.env.MONGODB_URL || 'mongodb://localhost:27017/voting_system';

async function connectDatabase() {
    try{
        await mongoose.connect(MONGODB_URL, {
            maxPoolSize: 10,               
            serverSelectionTimeoutMS: 5000, 
        });
        console.log(`DB connected (PID: ${process.pid}, url: ${MONGODB_URL})`);
    } catch (err) {
        console.error('MongoDB connection failed (ignored):', err.message);
    }

    try {
        // Test a MySQL connection
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log(`MySQL DB connected (PID: ${process.pid})`);
    } catch (err) {
        console.error('Both MongoDB and MySQL connection failed!', err.message);
        throw err;
    }
}

module.exports = connectDatabase;

