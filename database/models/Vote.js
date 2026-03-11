const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    betId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', required: true },
    // Validate this in your route/service layer before saving.
    option:    { type: String, required: true },
    // Exactly one of userId or visitorId must be present:
    //   - userId:    set when the voter is an authenticated User
    //   - visitorId: fallback for unauthenticated/anonymous voters (IP hash / session ID)
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
    visitorId: { type: String, sparse: true },
    votedAt:   { type: Date,   default: Date.now },
});

// One vote per authenticated user per bet
VoteSchema.index({ betId: 1, userId: 1 },    { unique: true, sparse: true });
// One vote per anonymous visitor per bet
VoteSchema.index({ betId: 1, visitorId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Vote', VoteSchema);
