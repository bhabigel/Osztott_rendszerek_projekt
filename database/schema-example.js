/*
DATABASE ARCHITECTURE FOR LOAD-BALANCED VOTING SYSTEM
======================================================

CRITICAL CONCEPT: ONE SHARED DATABASE
--------------------------------------
All PM2 instances (3001, 3002, 3003) connect to the SAME database.
This is essential because:
  - Votes from any instance must be visible to all others
  - The display_app needs to see all votes regardless of which instance received them
  - Data consistency across the distributed system

ARCHITECTURE DIAGRAM:
                                    
    [Browser] --> [nginx:8081] --> [PM2 Instance :3001] --\
                               --> [PM2 Instance :3002] ---+--> [Single Database]
                               --> [PM2 Instance :3003] --/
                                                              (MongoDB/PostgreSQL/MySQL)
    [Display App] -------------------------------------->

DATABASE OPTIONS:
-----------------
1. MongoDB (Recommended for this project - easy setup, good for JSON-like data)
   - npm install mongodb mongoose
   - Connection: mongodb://localhost:27017/voting_system

2. PostgreSQL (Better for complex queries, ACID compliance)
   - npm install pg
   - Connection: postgresql://user:pass@localhost:5432/voting_system

3. MySQL
   - npm install mysql2
   - Connection: mysql://user:pass@localhost:3306/voting_system

INSTALLATION (MongoDB on macOS):
--------------------------------
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

SCHEMA DESIGN:
--------------
*/

// Example MongoDB schema with Mongoose
const mongoose = require('mongoose');

// Bet/Question Schema
const BetSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    closesAt: { type: Date }
});

// Vote Schema
const VoteSchema = new mongoose.Schema({
    betId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', required: true },
    option: { type: String, required: true },
    
    // For sticky sessions / preventing double votes:
    visitorId: { type: String, required: true }, // IP hash or session ID
    
    votedAt: { type: Date, default: Date.now }
});

// Indexes for performance
VoteSchema.index({ betId: 1 });
VoteSchema.index({ betId: 1, visitorId: 1 }, { unique: true }); // One vote per user per bet

/*
CONNECTION POOLING:
-------------------
Each PM2 instance maintains its own connection pool to the database.
This is handled automatically by most database drivers.

Example connection setup:
*/

async function connectDatabase() {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/voting_system';
    
    await mongoose.connect(mongoUrl, {
        // Connection pool settings (shared across all requests in this instance)
        maxPoolSize: 10,  // Max connections per PM2 instance
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
    
    console.log(`Database connected (Instance PID: ${process.pid})`);
}

/*
RACE CONDITIONS & CONCURRENCY:
------------------------------
When multiple instances write to the same database simultaneously,
use atomic operations to prevent race conditions:

BAD (race condition):
  const bet = await Bet.findById(id);
  bet.totalVotes += 1;
  await bet.save();

GOOD (atomic):
  await Bet.findByIdAndUpdate(id, { $inc: { totalVotes: 1 } });

AGGREGATION FOR VOTE COUNTS:
----------------------------
Instead of storing totalVotes, calculate it:
*/

async function getVoteCounts(betId) {
    return await Vote.aggregate([
        { $match: { betId: new mongoose.Types.ObjectId(betId) } },
        { $group: { _id: '$option', count: { $sum: 1 } } }
    ]);
}

/*
REAL-TIME UPDATES (for display_app):
------------------------------------
Options for pushing vote updates to display:

1. Polling (simplest): Display app polls /api/results every few seconds

2. MongoDB Change Streams (recommended):
   Vote.watch().on('change', (change) => {
       io.emit('voteUpdate', change);  // Socket.io broadcast
   });

3. Redis Pub/Sub: Instances publish to Redis channel, display subscribes

WHERE TO IMPLEMENT:
-------------------
1. Create database/models/ folder with Bet.js and Vote.js
2. Create database/connection.js with the connection logic
3. Import and use in server.js (see server.js for integration comments)

ENVIRONMENT VARIABLES (.env):
-----------------------------
MONGODB_URL=mongodb://localhost:27017/voting_system
# Or for remote/production:
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/voting_system
*/

module.exports = {
    // These would be the actual exports in a real implementation
    // BetSchema,
    // VoteSchema,
    // connectDatabase,
    // getVoteCounts
};
