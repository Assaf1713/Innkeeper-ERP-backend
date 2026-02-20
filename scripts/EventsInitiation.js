require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const Events = require('../src/models/Events');

async function initiateEventsCollection() {
  await connectDB(process.env.MONGO_URI);
    console.log('✅ Events collection is ready for use.'); 
    mongoose.connection.close();
}
initiateEventsCollection().catch(err => {
    console.error('❌ Error initiating Events collection:', err);
    mongoose.connection.close();
});
  mongoose.connection.close();
  