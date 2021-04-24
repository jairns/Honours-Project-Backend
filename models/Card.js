const mongoose = require('mongoose');

const CardSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    deck: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'decks',
        required: true
    },
    question: {
        type: String,
        required: true
    },
    answerText: {
        type: String,
        required: true
    },
    status: {
        type: String
    },
    file: {
        type: String
    }
})

module.exports = mongoose.model('card', CardSchema);