const mongoose = require('mongoose');
const dns = require('dns');

if (process.env.NODE_ENV !== 'production') {
  dns.setDefaultResultOrder('ipv4first');
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  } catch (err) {
    console.warn('Unable to set custom DNS servers:', err.message);
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/maintainiq');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed default admin on every cold start
    const User = require('../models/User');
    const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@maintainiq.com';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!';

    const existingAdmin = await User.findOne({ email });
    if (!existingAdmin) {
      await User.create({ name: 'Default Admin', email, password, role: 'admin', phone: '123-456-7890' });
      console.log(`✅ Default admin auto-seeded: ${email}`);
    } else {
      existingAdmin.password = password;
      await existingAdmin.save();
      console.log(`✅ Default admin credentials synced from env on startup.`);
    }
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
