const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Determining storage location
        if(file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, 'storage/cards/image');
        } else {
            cb(null, 'storage/cards/audio');
        }
    },
    // Determining the name of the file
    filename: function(req, file, cb) {
        cb(null, uuidv4() + file.originalname.toLowerCase());
    }
});
const upload = multer({
    storage: storage
})
// Importing card model
const Card = require('../models/Card');

// Creating a new card
router.post('/', [auth, upload.single('file'), [
    check('deck', 'A deck is required')
        .not()
        .isEmpty(),
    check('question', 'Question is required')
        .not()
        .isEmpty(),
    check('answerText', 'a text answer is required')
        .not()
        .isEmpty(),
]], async (req, res) => {
    // Applying the validation to the data
    const errors = validationResult(req);
    // Checking if errors exist
    if(!errors.isEmpty()) {
        // Returning error message
        return res.status(400).json({ errors: errors.array() });
    }
    // Extracting the card details from the request
    const { deck, question, answerText, status } = req.body;

    try {
        // Creating a new instance of a card
        let newCard;
        // Card with file
        if(req.file) {
            newCard = new Card({
                question,
                answerText,
                status,
                deck,
                user: req.user.id,
                file: req.file.path
            })
        } else {
            // Card without file
            newCard = new Card({
                question,
                answerText,
                status,
                deck,
                user: req.user.id,
                file: 'null'
            })
        }
        // Saving new card to DB
        const card = await newCard.save();
        // Returning the new card
        res.json(card);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Deleting a card 
router.delete('/:id', auth, async (req, res) => {
    try {
        // Finding the card by id
        let card = await Card.findById(req.params.id);
        // Getting file path
        const filePath = card.file;
        // If card is not found, return error message
        if(!card) return res.status(404).json({ msg: 'Card not found' });
        // If the card does not belonging to the logged in user
        if(card.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorised' });
        }
        // Deleting the card
        await Card.findByIdAndRemove(req.params.id);
        // Removing file from storage
        fs.unlink(filePath, err => {
            console.log(err);
        })
        // Returning success message
        res.json({ msg: 'Card was removed' });
    } catch (error) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Getting cards within a certian deck 
router.get('/:deck', auth, async (req, res) => {
    try {
        // Get the cards which belong to the deck
        const cards = await Card.find({ deck: req.params.deck }).sort({ date: -1 })
        res.json(cards);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get specific card
router.get('/card/:id', auth, async (req, res) => {
    try {
        let card = await Card.findById(req.params.id);
        res.json(card);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Revise card
router.get('/revise/:deck', auth, async (req, res) => {
    try {
        // Count the number of cards which have the status of hard
        const count = await Card.find({ deck: req.params.deck, status: 'hard' }).countDocuments();
        // Get a random  number upto the count variable
        const random = Math.floor(Math.random() * count)
        let card;
        // Finding a random card with the status of hard
        card = await Card.findOne().where({ deck: req.params.deck, status: 'hard' }).skip(random);
        // If no cards with the status of hard exist
        if(card === null) {
            // Count the number of cards which have the status of medium
            const count = await Card.find({ deck: req.params.deck, status: 'medium' }).countDocuments();
            const random = Math.floor(Math.random() * count)
            // Finding a random card with the status of medium
            card = await Card.findOne().where({ deck: req.params.deck, status: 'medium' }).skip(random);
            // If no cards with the status of medium exist
            if(card === null) {
                // Count the number of cards which have the status of easy
                const count = await Card.find({ deck: req.params.deck, status: 'easy' }).countDocuments();
                const random = Math.floor(Math.random() * count)
                // Finding a random card with the status of easy
                card = await Card.findOne().where({ deck: req.params.deck, status: 'easy' }).skip(random);
            }
        }
        // Return card
        res.json(card)
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update card   
router.put('/:id', [auth, upload.single('file'), [
    check('deck', 'A deck is required')
        .not()
        .isEmpty(),
    check('question', 'Question is required')
        .not()
        .isEmpty(),
    check('answerText', 'a text answer is required')
        .not()
        .isEmpty(),
]], async (req, res) => {
    // Extracting the card details from the request
    const { deck, question, answerText, status } = req.body;
    let file;

    if(req.file) {
        file = req.file.path;
    }
    // Build a card object
    const cardFields = {};
    if(deck) cardFields.deck = deck;
    if(question) cardFields.question = question;
    if(answerText) cardFields.answerText = answerText;
    if(status) cardFields.status = status;
    if(file) cardFields.file = file;
    try {
        // Finding the card by id
        let card = await Card.findById(req.params.id);
        // If card is not found, return error message
        if(!card) return res.status(404).json({ msg: 'Card not found' });
        // If the card does not belonging to the logged in user
        if(card.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorised' });
        }
        // Updating the card
        card = await Card.findByIdAndUpdate(req.params.id, {
            // Set the fields equal to the new fields
            $set: cardFields
        },
        { 
            // If the card doesnt exist, create it
            new: true 
        });
        // Sending the updated card
        res.json(card);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Delete file from card
router.put('/delete/file/:id', auth, async(req, res) => {
    try {
        // Finding the card by id
        let card = await Card.findById(req.params.id);
        // Getting file path
        const filePath = card.file;
        // If card is not found, return error message
        if(!card) return res.status(404).json({ msg: 'Card not found' });
        // If the card does not belonging to the logged in user
        if(card.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorised' });
        }
        // Updating the card
        card = await Card.findByIdAndUpdate(req.params.id, {
            // Set the fields equal to the new fields
            $unset: { file: 'null' }
        });
        // Removing file from storage
        fs.unlink(filePath, err => {
            console.log(err);
        })
        // Sending the updated card
        res.json(card);
    } catch (error) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;