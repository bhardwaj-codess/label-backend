require('dotenv').config();
const mongoose = require('./config/db');
const User = require('./models/User');
const connectDB = require('./config/db');

async function seedUser() {
    try {
        await connectDB();
        
        const email = 'abhibhardwaj23061@gmail.com';
        const password = '123456';
        const name = 'Vashishat User';

        // Check if exists
        const exists = await User.findOne({ email });
        if (exists) {
            console.log(`User already exists: ${email}`);
            process.exit(0);
        }

        await User.create({ name, email, password });
        console.log('✅ User registered successfully!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding user:', err);
        process.exit(1);
    }
}

seedUser();
