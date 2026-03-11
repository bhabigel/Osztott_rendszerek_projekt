/**
 * Seed script — inserts a sample Bet into the database.
 *
 * Usage:
 *   node database/seed.js
 *
 * Run this ONCE after starting MongoDB to have data to work with.
 * Running it again will skip insertion if a bet with the same question exists.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDatabase = require('./connection');
const Bet = require('./models/Bet');

async function seed() {
    await connectDatabase();

    const existing = await Bet.findOne({ question: 'Will it rain in London tomorrow?' });
    if (existing) {
        console.log('Seed data already present, skipping.');
        console.log('Existing bet id:', existing._id.toString());
        await mongoose.disconnect();
        return;
    }

    const bet = await Bet.create({
        question: 'Will it rain in London tomorrow?',
        options: ['Yes', 'No'],
        isActive: true,
    });

    console.log('Inserted bet:');
    console.log('  _id     :', bet._id.toString());
    console.log('  question:', bet.question);
    console.log('  options :', bet.options.join(', '));
    console.log('');
    console.log('Use this _id as betId when testing POST /api/vote');

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
