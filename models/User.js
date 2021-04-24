const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    passwordResetId: {
        type: String
    }, 
    passwordResetIdExpiresIn: {
        type: Number
    } 
})

module.exports = mongoose.model('user', UserSchema);