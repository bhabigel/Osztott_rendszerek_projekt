const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

/*
DATABASE INTEGRATION - TODO FOR TASK 3:
=======================================
1. Install mongoose: npm install mongoose
2. Uncomment the database imports and connection below
3. Replace mock data routes with database queries

All PM2 instances connect to the SAME database - this is critical!
See database/schema-example.js for full schema and explanation.
*/

// DATABASE IMPORTS (uncomment when ready):
// const mongoose = require('mongoose');
// const Bet = require('../database/models/Bet');
// const Vote = require('../database/models/Vote');

// DATABASE CONNECTION (uncomment when ready):
// const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/voting_system';
// mongoose.connect(MONGODB_URL)
//     .then(() => console.log(`DB connected (PID: ${process.pid})`))
//     .catch(err => console.error('DB connection error:', err));

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend files - use absolute path to avoid issues when running from different directories
app.use(express.static(path.join(__dirname, '../web_client')));

// ============================================================================
// MOCK DATA - REPLACE WITH DATABASE IN TASK 3
// ============================================================================
// WARNING: Each PM2 instance has its OWN copy of this data!
// Votes on instance 3001 won't appear on instance 3002.
// This is why you NEED a shared database.
let currentBet = {
    id: "rain-101",
    question: "Will it rain in London tomorrow?",
    options: ["Yes", "No"],
    totalVotes: 0
};

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint for load balancer
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        pid: process.pid, 
        port: PORT,
        // Add database health check when implemented:
        // dbConnected: mongoose.connection.readyState === 1
    });
});

// API to get the current bet
// DATABASE VERSION:
// app.get('/api/bet', async (req, res) => {
//     const bet = await Bet.findOne({ isActive: true });
//     const votes = await Vote.aggregate([
//         { $match: { betId: bet._id } },
//         { $group: { _id: '$option', count: { $sum: 1 } } }
//     ]);
//     res.json({ ...bet.toObject(), votes, _debug: { pid: process.pid, port: PORT } });
// });
app.get('/api/bet', (req, res) => {
    // Include instance info for debugging load balancing
    res.json({
        ...currentBet,
        _debug: { pid: process.pid, port: PORT }
    });
});

// API to submit a vote
// DATABASE VERSION:
// app.post('/api/vote', async (req, res) => {
//     const { betId, option } = req.body;
//     const visitorId = req.ip; // Or use session ID with ip_hash
//     
//     try {
//         // Atomic upsert - prevents double voting
//         await Vote.findOneAndUpdate(
//             { betId, visitorId },
//             { betId, option, visitorId, votedAt: new Date() },
//             { upsert: true }
//         );
//         res.json({ success: true, message: 'Vote recorded' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });
app.post('/api/vote', (req, res) => {
    const { option } = req.body;
    if (currentBet.options.includes(option)) {
        currentBet.totalVotes++;
        // WARNING: This only updates THIS instance's data!
        res.json({ 
            success: true, 
            message: `Vote for "${option}" recorded on instance ${PORT}`,
            _debug: { pid: process.pid, port: PORT }
        });
    } else {
        res.status(400).json({ error: 'Invalid option' });
    }
});

// ============================================================================
// START SERVER
// ============================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Instance running on port ${PORT} (Process ID: ${process.pid})`);
});