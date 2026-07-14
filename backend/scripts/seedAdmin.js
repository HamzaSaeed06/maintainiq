require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@maintainiq.com';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!';

    if (!email || !password) {
      console.error('Error: DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be defined in env config.');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      existingAdmin.password = password;
      await existingAdmin.save();
      console.log(`Admin user with email ${email} already exists. Updated/reset password successfully.`);
      process.exit(0);
    }

    // Create admin user
    await User.create({
      name: 'Default Admin',
      email,
      password,
      role: 'admin',
      phone: '123-456-7890'
    });

    console.log(`Successfully seeded default admin user: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
