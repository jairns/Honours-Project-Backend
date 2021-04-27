const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const {v4 : uuidv4} = require('uuid');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
// Importing user model
const User = require('../models/User');
require('dotenv/config');

// Get logged in user
router.get('/', auth, async (req, res) => {
    try {
        // Getting user from the database
        const user = await User.findById(req.user.id).select('-password');
        // Returning user
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Log in
router.post('/', [
    check('email', 'Please include a valid email')
        .isEmail(),
    check('password', 'Password is required').exists()
], async (req, res) => {
    // Applying the validation to the data
    const errors = validationResult(req);
    // Checking if errors exist
    if(!errors.isEmpty()) {
        // Returning error message
        return res.status(400).json({ errors: errors.array() });
    }
    // Extracting email and password
    const { email, password } = req.body;

    try {
        // Checking if the user exists
        let user = await User.findOne({ email });
        // If the user does not exist
        if(!user) {
            // Return error message
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        // Checking if the password entered matches the encrypted password within the DB
        const isMatch = await bcrypt.compare(password, user.password);
        // If they dont match
        if(!isMatch) {
            // Return error message
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        // Creating payload
        const payload = {
            // Returning the user id within the payload
            user: {
                id: user.id
            }
        }
        // If the email and password are correct, generate a token
        jwt.sign(payload, process.env.JWT_SECRET, { 
            // Token will expire in
            expiresIn: 360000
        }, (err, token) => {
            // If error exists, throw it
            if(err) throw err;
            // If error does not exist, return token
            res.json({ token });
        })
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Forgot Password
router.put("/forgot", async (req, res) => {
    const email = req.body.email;
    try {
        let user = await User.findOne({ email }); 
        // If the user does not exist
        if(!user) {
            // Return error message
            return res.status(400).json({ msg: 'The provided email address is not registered with omnilingu' });
        } else {
            // 1 minute for testing purposes
            // const expiresIn = Date.now() + 60000;
            // Set expiration time eqaul to 30 minutes from reset request
            const expiresIn = Date.now() + 1800000;
            // Generate reset token
            const resetId = uuidv4();

            // Updating the password
            user = await User.findByIdAndUpdate(user._id, {
                // Update fields 
                passwordResetId: resetId,
                passwordResetIdExpiresIn: expiresIn
            });

             // Return error message
            res.status(200).json({ msg: 'An email has been sent. Please check your inbox.' });

            // Gmail SMTP
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: process.env.GMAIL_USER,
                  pass: process.env.GMAIL_PWD,
                }
              });

            // Creating the email 
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: user.email,
                subject: 'Reset omnilingu password',
                html: `
                    <h1 style="font-family: 'Roboto', sans-serif; font-size: 25pt; color: #1865f2">Reset Omnilingu Password</h1>
                    <h2 style="font-family: 'Roboto', sans-serif">Hi ${user.email}</h2>
                    <p style="font-family: 'Roboto', sans-serif">
                        To reset your password follow the link below. The link is only active for 30 minutes. 
                    </p>
                    <a href="https://omnilingu.herokuapp.com/reset/${expiresIn}/${user.email}/${resetId}" 
                        style="font-family: 'Roboto', sans-serif; color: #1865f2">
                        https://omnilingu.herokuapp.com/reset/${expiresIn}/${user.email}/${resetId}
                    </a>` 
              }
              
              // Send email or display error message
              transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
        }
    } catch (error) {
        console.log(error);
    }
});

// Reset Password
router.put("/reset/password", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const passwordResetId = req.body.resetId;
    const currentTime = Date.now();
    try {
        let user = await User.findOne({ email }); 
        // If the user does not exist
        if(!user) {
            // Return error message
            return res.status(400).json({ msg: 'The provided email address is not registered with omnilingu' });
            // If like has expired 
        } else if(currentTime > user.passwordResetIdExpiresIn || passwordResetId !== user.passwordResetId) {
             // Return error message
             return res.status(400).json({ msg: 'Update failed. The link may have expired. Please try again.' });
        } else {
            const salt = await bcrypt.genSalt(10);
            // Hashing the password
            user.password = await bcrypt.hash(password, salt);
            // Updating the user
            user = await User.findByIdAndUpdate(user._id, {
                // Update fields 
                password: user.password
            });
            return res.status(200).json({ msg: 'Your password was successfully updated.' });
        }
    } catch (error) {
        console.log(error);
    }
});

module.exports = router;