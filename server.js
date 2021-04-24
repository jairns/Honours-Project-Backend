const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors')
require('dotenv/config');

// Enabling cors
app.use(cors())

// Connecting to Database
mongoose.connect(process.env.DB_CONNECTION, 
    { 
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    },
    () => console.log('connected to db')
);

// Middleware
app.use(express.json({ extended: false }));

// Public directories
app.use('/storage/decks', express.static('storage/decks'));
app.use('/storage/cards/audio', express.static('storage/cards/audio'));
app.use('/storage/cards/image', express.static('storage/cards/image'));

// Defining routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/decks', require('./routes/decks'));
app.use('/api/cards', require('./routes/cards'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));