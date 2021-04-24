const mongoose = require('mongoose');

const DeckSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    file: {
        type: String
    }
})

module.exports = mongoose.model('deck', DeckSchema);