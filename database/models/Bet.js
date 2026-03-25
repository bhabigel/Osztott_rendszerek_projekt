const mongoose = require('mongoose');

const BetSchema = new mongoose.Schema({
    question:   { type: String, required: true },
    options:    [{ type: String, required: true }],
    isActive:   { type: Boolean, default: true },
    createdAt:  { type: Date,   default: Date.now },
    closesAt:   Date,
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Task 4: melyik adatbázis backend tárolja a szavazatokat
    dbType:     { type: String, enum: ['mongodb', 'mysql', 'jsonfile'], default: 'mongodb' },
    // 'text' típusnál szöveges válasz, 'choice' típusnál rádiógomb
    questionType: { type: String, enum: ['choice', 'text'], default: 'choice' },
});

module.exports = mongoose.model('Bet', BetSchema);
