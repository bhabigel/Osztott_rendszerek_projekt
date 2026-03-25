const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    betId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', required: true },
    option:    { type: String, required: true },
    // Pontosan egyiket kell megadni (nem mindkettőt):
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    visitorId: { type: String },
    votedAt:   { type: Date, default: Date.now },
    region:    { type: String, default: null },
    city:      { type: String, default: null },
});

// Partial filter: csak valódi (nem null) értékekre érvényes az egyediség
// → egy bejelentkezett user per szavazás csak egyszer szavazhat
VoteSchema.index(
    { betId: 1, userId: 1 },
    { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);
// → egy anonim látogató (IP) per szavazás csak egyszer szavazhat
VoteSchema.index(
    { betId: 1, visitorId: 1 },
    { unique: true, partialFilterExpression: { visitorId: { $type: 'string' } } }
);

module.exports = mongoose.model('Vote', VoteSchema);
