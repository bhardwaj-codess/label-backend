require('dotenv').config();
const express = require('express');
const mongoose = require('./src/config/db');
const cors = require('cors');
const path = require('path'); 

const connectDB = require('./src/config/db');
const app = express();

connectDB();

app.use(cors());
app.use(express.json());

// Serve the static frontend files first
app.use(express.static(path.join(__dirname, '../frontend')));

// Define a specific route for the main login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// All API routes come after the static file and root route handlers
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/labels', require('./src/routes/labels'));
app.use('/api/history', require('./src/routes/history'));
app.use('/api/addresses', require('./src/routes/addresses'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));