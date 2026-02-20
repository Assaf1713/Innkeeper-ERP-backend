const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Adjust the path to your User model as needed
const User = require("../src/models/User"); 

const seedSuperAdmin = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding Super Admin...");

    // 2. Check if a SUPER_ADMIN already exists to prevent duplicates
    const existingAdmin = await User.findOne({ role: "SUPER_ADMIN" });
    if (existingAdmin) {
      console.log("A SUPER_ADMIN user already exists in the database. Exiting.");
      process.exit(0);
    }

    // 3. Hash the initial password (e.g., "123456" - you must change this after first login!)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("maxi54mil", salt);

    // 4. Create the super admin user
    const superAdmin = await User.create({
      username: "assaf_admin", 
      password: hashedPassword,
      role: "SUPER_ADMIN",
    });

    console.log(`Super Admin created successfully! Username: ${superAdmin.username}`);
    process.exit(0);
    
  } catch (error) {
    console.error("Error seeding super admin:", error);
    process.exit(1);
  }
};

seedSuperAdmin();