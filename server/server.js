const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDatabase = require('../database/connection');
const Bet  = require('../database/models/Bet');
const Vote = require('../database/models/Vote');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../web_client')));

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        pid: process.pid,
        port: PORT,
        dbConnected: mongoose.connection.readyState === 1,
    });
});

// GET the current active bet with live vote counts
app.get('/api/bet', async (req, res) => {
    try {
        const bet = await Bet.findOne({ isActive: true });
        if (!bet) return res.status(404).json({ error: 'No active bet found' });

        const votes = await Vote.aggregate([
            { $match: { betId: bet._id } },
            { $group: { _id: '$option', count: { $sum: 1 } } },
        ]);

        res.json({ ...bet.toObject(), votes, _debug: { pid: process.pid, port: PORT } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/vote', async (req, res) => {
    const { betId, option } = req.body;
    const visitorId = req.ip;

    if (!betId || !option) {
        return res.status(400).json({ error: 'betId and option are required' });
    }

    try {
        const bet = await Bet.findById(betId);
        if (!bet || !bet.isActive) {
            return res.status(404).json({ error: 'Bet not found or not active' });
        }
        if (!bet.options.includes(option)) {
            return res.status(400).json({ error: 'Invalid option' });
        }

        // Atomic upsert: if the visitor already voted, update their choice instead of inserting a duplicate
        await Vote.findOneAndUpdate(
            { betId, visitorId },
            { betId, option, visitorId, votedAt: new Date() },
            { upsert: true }
        );

        res.json({
            success: true,
            message: `Vote for "${option}" recorded`,
            _debug: { pid: process.pid, port: PORT },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




const PORT = process.env.PORT || 3000;

connectDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Instance running on port ${PORT} (Process ID: ${process.pid})`);
        });
    })
    .catch((err) => {
        console.error('Failed to connect to database, server not started:', err.message);
        process.exit(1);
    });