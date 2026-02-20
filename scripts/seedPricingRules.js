const mongoose = require("mongoose");
require("dotenv").config(); // Ensure you have dotenv installed to load MONGO_URI

// Adjust the path to your actual model file
const PriceListRule = require("../src/models/PriceListRule");

const seedPriceRules = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // Optional: Clear existing rules to avoid duplicates during development
    await PriceListRule.deleteMany({});
    console.log("Cleared existing price rules.");

    // 2. Define the rules
    const rules = [
      {
        name: "בר קוקטיילים לאירוע עסקי עד 50 אורחים",
        eventTypes: ["CORP_HAPPY_HOUR", "CORP_MINGLE"], // Must match the 'code' field in EventType model
        minGuests: 0,
        maxGuests: 60,
        maxHours: 3,

        // Pricing Strategy
        basePrice: 4000,
        pricePerHead: 20,

        // Extra Costs
        extraHourPrice: 750,

        isActive: true,
      },

      {
        name: "בר קוקטיילים לאירוע עסקי עד 100 אורחים",
        eventTypes: ["PRIVATE_COCKTAIL", "CORP_HAPPY_HOUR", "CORP_MINGLE"], // Must match the 'code' field in EventType model
        minGuests: 61,
        maxGuests: 110,
        maxHours: 3,

        // Pricing Strategy
        basePrice: 5000,
        pricePerHead: 20,

        // Extra Costs
        extraHourPrice: 750,

        isActive: true,
      },
      {
        name: "בר קוקטיילים לאירוע פרטי קטן",
        eventTypes: ["PRIVATE_COCKTAIL"], // Must match the 'code' field in EventType model
        minGuests: 0,
        maxGuests: 30,
        maxHours: 3,

        // Pricing Strategy
        basePrice: 3000,
        pricePerHead: 25,

        // Extra Costs
        extraHourPrice: 500,

        isActive: true,
      },
      {
        name: "בר קוקטיילים לאירוע פרטי קטן 50 איש",
        eventTypes: ["PRIVATE_COCKTAIL"], // Must match the 'code' field in EventType model
        minGuests: 31,
        maxGuests: 50,
        maxHours: 3,

        // Pricing Strategy
        basePrice: 3500,
        pricePerHead: 25,

        // Extra Costs
        extraHourPrice: 500,

        isActive: true,
      },

      {
        name: "בר קוקטיילים לאירוע מעל 100 איש",
        eventTypes: ["PRIVATE_COCKTAIL", "CORP_HAPPY_HOUR", "CORP_MINGLE"], // Must match the 'code' field in EventType model
        minGuests: 111,
        maxGuests: 200,
        maxHours: 4,

        // Pricing Strategy
        basePrice: "",
        pricePerHead: 50,

        // Extra Costs
        extraHourPrice: 750,

        isActive: true,
      },
      {
        name: "בר קוקטיילים לקבלת פנים עד 300 איש",
        eventTypes: ["RECEPTION"], // Must match the 'code' field in EventType model
        minGuests: 0,
        maxGuests: 300,
        maxHours: 2,

        // Pricing Strategy
        basePrice: 4200,
        pricePerHead: 10,

        // Extra Costs
        extraHourPrice: 750,

        isActive: true,
      },
      {
        name: "בר קוקטיילים לקבלת פנים עד 350 איש",
        eventTypes: ["RECEPTION"], // Must match the 'code' field in EventType model
        minGuests: 301,
        maxGuests: 350,
        maxHours: 2,

        // Pricing Strategy
        basePrice: 4700,
        pricePerHead: 10,

        // Extra Costs
        extraHourPrice: 750,

        isActive: true,
      },
      {
        name: "בר קוקטיילים לקבלת פנים עד 400 איש",
        eventTypes: ["RECEPTION"], // Must match the 'code' field in EventType model
        minGuests: 351,
        maxGuests: 400,
        maxHours: 2,

        // Pricing Strategy
        basePrice: 5200,
        pricePerHead: 10,

        // Extra Costs
        extraHourPrice: 750,

        isActive: true,
      },
      {
        name: "בר מלא לאירוע פרטי עד 100 איש",
        eventTypes: ["PRIVATE_FULL_BAR", "CORP_PARTY"], // Must match the 'code' field in EventType model
        minGuests: 0,
        maxGuests: 100,
        maxHours: 4,

        // Pricing Strategy
        basePrice: 7000,
        pricePerHead: "",

        // Extra Costs
        extraHourPrice: 750,

        isActive: true,
      },
            {
        name: "בר מלא לאירוע פרטי מעל 100 איש",
        eventTypes: ["PRIVATE_FULL_BAR", "CORP_PARTY"], // Must match the 'code' field in EventType model
        minGuests: 101,
        maxGuests: 200,
        maxHours: 4,

        // Pricing Strategy
        basePrice: "" ,
        pricePerHead: 60,

        // Extra Costs
        extraHourPrice: 750,
        isActive: true,
      },
    ];

    // 3. Insert into Database
    // Using insertMany is more efficient for bulk operations
    await PriceListRule.insertMany(rules);

    console.log(`Successfully seeded ${rules.length} price rules!`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding price rules:", error);
    process.exit(1);
  }
};

seedPriceRules();
