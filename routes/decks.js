const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'storage/decks/');
    },
    filename: function(req, file, cb) {
        cb(null, uuidv4() + file.originalname.toLowerCase());
    }
});
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
          cb(null, true);
        } else {
          cb(null, false);
          return cb(new Error('Invalid file format. Only png, jpg, and jpeg are allowed.'));
        }
    }
})
// Importing deck model
const Deck = require('../models/Deck');
const Card = require('../models/Card');

// Get decks
router.get('/', auth, async (req, res) => {
    try {
        // Get the decks belonging to the authorised user, order by latest
        const decks = await Deck.find({ user:req.user.id }).sort({ date: -1 })
        res.json(decks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get specific deck
router.get('/:id', auth, async (req, res) => {
    try {
        const decks = await Deck.find({ _id: req.params.id })
        res.json(decks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Create new deck
router.post('/', [auth, upload.single('file'), [
    check('title', 'Title is required')
        .not()
        .isEmpty(),
    check('description', 'Description is required')
        .not()
        .isEmpty()
]], async (req, res) => {
    // Applying the validation to the data
    const errors = validationResult(req);
    // Checking if errors exist
    if(!errors.isEmpty()) {
        // Returning error message
        return res.status(400).json({ errors: errors.array() });
    }
    // Extracting the deck details from the request
    const { title, description } = req.body;

    try {

        let newDeck;

        if(req.file) {
            // Creating a new instance of a deck
            newDeck = new Deck({
                title,
                description,
                user: req.user.id,
                file: req.file.path
            });
        } else {
            newDeck = new Deck({
                title,
                description,
                user: req.user.id,
                file: 'null'
            });
        }
        // Saving new deck to DB
        const deck = await newDeck.save();
        // Returning the new deck
        res.json(deck);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update a deck
router.put('/:id', [auth, upload.single('file'), [
    check('title', 'Title is required')
        .not()
        .isEmpty(),
    check('description', 'Description is required')
        .not()
        .isEmpty()
]], async (req, res) => {
    // Extracting the deck details from the request
    const { title, description } = req.body;

    let file;

    if(req.file) {
        file = req.file.path;
    }
    // Build a deck object
    const deckFields = {};
    if(title) deckFields.title = title;
    if(description) deckFields.description = description;
    if(file) deckFields.file = file;
    try {
        // Finding the deck by id
        let deck = await Deck.findById(req.params.id);
        // If deck is not found, return error message
        if(!deck) return res.status(404).json({ msg: 'Deck not found' });
        // If the deck does not belonging to the logged in user
        if(deck.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorised' });
        }
        // Updating the deck
        deck = await Deck.findByIdAndUpdate(req.params.id, {
            // Set the fields equal to the new fields
            $set: deckFields
        },
        { 
            // If the deck doesnt exist, create it
            new: true 
        });
        // Sending the updated deck
        res.json(deck);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Delete a deck
router.delete('/:id', auth, async (req, res) => {
    try {
        // Finding the deck by id
        let deck = await Deck.findById(req.params.id);
        // Getting file path
        const filePath = deck.file;
        // If deck is not found, return error message
        if(!deck) return res.status(404).json({ msg: 'Deck not found' });
        // If the deck does not belonging to the logged in user
        if(deck.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorised' });
        }
        // Deleting the deck
        await Deck.findByIdAndRemove(req.params.id);
        // Deleting the cards associated with this deck
        let cards = await Card.find({ deck: req.params.id });
        
        await Card.deleteMany({deck: req.params.id});

        // Removing file from storage
        if(deck.file) {
            fs.unlink(filePath, err => {
                console.log(err);
            })
        }

        // Removing the files from the cards within this deck
        for(i=0; i < cards.length; i++) {
            fs.unlink(cards[i].file, err => {
                console.log(err);
            })
        }

        // Returning success message
        res.json({ msg: 'Deck was removed' });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

router.put('/delete/thumbnail/:id', auth, async(req, res) => {
    try {
        // Finding the deck by id
        let deck = await Deck.findById(req.params.id);
        // Getting file path
        const filePath = deck.file;
        // If deck is not found, return error message
        if(!deck) return res.status(404).json({ msg: 'Deck not found' });
        // If the deck does not belonging to the logged in user
        if(deck.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorised' });
        }
        // Updating the deck's file
        deck = await Deck.findByIdAndUpdate(req.params.id, {
            // Set the fields equal to the new fields
            $unset: { file: 'null' }
        });

        // Removing file from storage
        fs.unlink(filePath, err => {
            console.log(err);
        })

        // Sending the updated deck
        res.json(deck);
    } catch (error) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;