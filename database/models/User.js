const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username:     { type: String, required: true, unique: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }, 
    role:         { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive:     { type: Boolean, default: true },
    createdAt:    { type: Date,   default: Date.now },
});

// Never expose passwordHash in API responses
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    return obj;
};

module.exports = mongoose.model('User', UserSchema);
