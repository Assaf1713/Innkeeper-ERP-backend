require('dotenv').config();
const mongoose = require('mongoose');

// Load models
const Supplier = require('../src/models/Supplier');
const InventoryProduct = require('../src/models/InventoryProduct');

const migrateSuppliers = async () => {
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const defaultSupplierName = 'אחת שתיים שלוש';

    // Check if the default supplier already exists
    let defaultSupplier = await Supplier.findOne({ name: defaultSupplierName });

    // Create the supplier if it does not exist
    if (!defaultSupplier) {
      defaultSupplier = new Supplier({
        name: defaultSupplierName,
        contactName: 'דודו',
        phone: '+972543131346', 
        email: '',
        isActive: true,
        notes: ''
      });
      
      await defaultSupplier.save();
      console.log(`Created default supplier: ${defaultSupplierName}`);
    } else {
      console.log(`Supplier ${defaultSupplierName} already exists`);
    }

    // Update all existing inventory products to point to the new supplier ObjectId
    // and set superCategory to default 'ALCOHOL' where it's not already set
    const result = await InventoryProduct.updateMany(
      {}, 
      { $set: { supplier: defaultSupplier._id, superCategory: 'ALCOHOL', defaultForWork: true } }
    );

    console.log(`Successfully updated ${result.modifiedCount} inventory products to the new supplier.`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

migrateSuppliers();