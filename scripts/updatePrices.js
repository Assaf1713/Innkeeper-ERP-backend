const mongoose = require("mongoose");
const { roundPrices } = require("../src/services/InventoryProductPriceUpdate");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await roundPrices();
    

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();