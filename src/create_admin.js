require('dotenv').config();
const mongoose = require('./config/db');
const User = require('./models/User');
const connectDB = require('./config/db');

async function createAdmin() {
    try {
        await connectDB();
        
        const email = 'admin@example.com';
        const password = 'password123';
        const name = 'Admin User';

        // Check if exists
        const exists = await User.findOne({ email });
        if (exists) {
            console.log('User already exists');
            process.exit(0);
        }

        await User.create({ name, email, password });
        console.log(`User created: ${email} / ${password}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createAdmin();
