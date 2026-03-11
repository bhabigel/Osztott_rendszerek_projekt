const mongoose = require('mongoose');

const BetSchema = new mongoose.Schema({
    question:   { type: String, required: true },
    options:    [{ type: String, required: true }],
    isActive:   { type: Boolean, default: true },
    createdAt:  { type: Date,   default: Date.now },
    closesAt:   Date,
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
});

module.exports = mongoose.model('Bet', BetSchema);
