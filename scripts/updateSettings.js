const mongoose = require("mongoose");
const Settings = require("../src/models/Settings");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

// Get arguments from command line
const [key, value] = process.argv.slice(2);

(async () => {
  try {
    if (!key || value === undefined) {
      console.error("Usage: node updateSetting.js <key> <value>");
      console.error("Example: node updateSetting.js profitMarginTarget 100");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const result = await Settings.findOneAndUpdate(
      { key },
      { value: Number(value) || value },
      { new: true }
    );

    if (result) {
      console.log(`✅ Updated ${key}: ${result.value}`);
    } else {
      console.log(`❌ Setting '${key}' not found`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();