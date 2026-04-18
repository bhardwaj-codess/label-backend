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
app.use(express.static(path.join(__dirname, '../label-generator/dist')));

// Define a specific route for the main login page
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '../label-generator/dist/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(404).send("Frontend not built. Please run 'npm run build' in label-generator.");
        }
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// All API routes come after the static file and root route handlers
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/labels', require('./src/routes/labels'));
app.use('/api/history', require('./src/routes/history'));
app.use('/api/addresses', require('./src/routes/addresses'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));