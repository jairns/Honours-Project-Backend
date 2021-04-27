const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv/config');
const { check, validationResult } = require('express-validator');
// Importing user model
const User = require('../models/User');
// Importing deck model
const Deck = require('../models/Deck');
// Importing card model
const Card = require('../models/Card');

// Get user
router.get('/', async (req, res) => {
    try {
        // Finding the user
        const users = await User.find()
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Register user
router.post('/', [
    check('email', 'Please include a valid email')
        .isEmail(),
    check('password', 'Please enter a password with 6 or more characters')
        .isLength({
            min: 6
        })
], async (req, res) => {
    // Applying the validation to the data
    const errors = validationResult(req);
    // Checking if errors exist
    if(!errors.isEmpty()) {
        // Returning error message
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;

    try {
        // Checking if an account with the email exists
        let user = await User.findOne({ email });
        // If the user exists
        if(user) {
            // Return error msg
            return res.status(400).json({ msg: 'User already exists' })
        }
        // If the user doesnt exist, create a new instance of the user
        user = new User({
            email,
            password
        });
        // Generating a salt using the bcrypt genSalt method
        const salt = await bcrypt.genSalt(10);
        // Hashing the password
        user.password = await bcrypt.hash(password, salt);
        // Saving user to the database
        await user.save();
        // Creating payload - object I want to send in the token
        const payload = {
            // Returning the user id
            user: {
                id: user.id
            }
        }
        // Signing the token, passing in the userID and the secret
        jwt.sign(payload, process.env.JWT_SECRET, { 
            // Token will expire in
            expiresIn: 360000
         }, (err, token) => {
             // If error exists, throw it
             if(err) throw err;
             // If error does not exist, return token
             res.json({ token });
         });
    } catch (err) {
        // Console the error
        console.error(err.message);
        // Return error message
        res.status(500).send('Server Error');
    }
});

// Delete account
router.delete('/:id', auth, async (req, res) => {
    try {
        // Finding the user by id
        let user = await User.findById(req.params.id);
        // Ensuring the user is authorised
        if(user._id.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorised' });
        }
        // Deleting the user
        await User.findByIdAndRemove(req.params.id);
        // Storing the cards in variable
        let cards = await Card.find({ user: req.params.id });
        // Deleting the cards
        await Card.deleteMany({ user: req.params.id });
        // Removing the files from the cards within this deck
        for(i=0; i < cards.length; i++) {
                fs.unlink(cards[i].file, err => {
                console.log(err);
            });
        }
        // Storing the cards in variable
        let decks = await Deck.find({ user: req.params.id });
        // Deleting the cards
        await Deck.deleteMany({ user: req.params.id });
        //Removing the files from the cards within this deck
        for(i=0; i < decks.length; i++) {
            fs.unlink(decks[i].file, err => {
                console.log(err);
            });
        }
        // Returning success message
        res.json({ msg: 'User was removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;