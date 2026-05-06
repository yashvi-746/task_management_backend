require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const existing = await User.findOne({ email: 'admin@example.com' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123456',
    role: 'admin',
  });
  console.log('Admin created:', admin.email, '| Password: admin123456');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
