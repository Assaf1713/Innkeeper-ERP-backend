const mongoose = require('mongoose');
const Expense = require('../models/Expenses');
require('dotenv').config();

async function migrateRentCategory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Update all expenses where name is "שכירות" to have category "שכירות"
    const result = await Expense.updateMany(
      { name: 'שכירות' },
      { $set: { category: 'שכירות' } }
    );

    console.log(`Migration completed successfully!`);
    console.log(`Matched documents: ${result.matchedCount}`);
    console.log(`Modified documents: ${result.modifiedCount}`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateRentCategory();
