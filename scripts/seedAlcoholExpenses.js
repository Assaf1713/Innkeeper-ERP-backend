const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const AlcoholExpense = require("../src/models/AlcoholExpense");
const InventoryProduct = require("../src/models/InventoryProduct");
const Event = require("../src/models/Events");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "cleaned_alcohol_expenses.csv");

    console.log("Reading CSV from:", csvPath);

    const raw = fs.readFileSync(csvPath, "utf8");

    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Cache all products and events to avoid repeated DB queries
    const allProducts = await InventoryProduct.find({});
    const productMap = new Map(
      allProducts.map((prod) => [prod.label.trim(), prod])
    );

    const allEvents = await Event.find({});
    const eventMap = new Map(
      allEvents.map((evt) => [evt.eventNumber, evt])
    );

    let created = 0;
    let updated = 0;
    let notFoundEvents = new Set();
    let notFoundProducts = new Set();

    for (const r of records) {
      const eventNumber = parseInt(r["eventNumber"]);
      const productName = String(r["productName"] || "").trim();
      const bottlesUsed = parseFloat(r["bottlesUsed"] || 0);
      const totalAmount = parseFloat(r["TotalAmount"] || 0);
      const amountPerGuest = parseFloat(r["amountPerGuest"] || 0);

      // Skip empty rows
      if (!eventNumber || !productName) {
        continue;
      }

      // Find the event
      const event = eventMap.get(eventNumber);
      if (!event) {
        notFoundEvents.add(eventNumber);
        continue;
      }

      // Find the product
      const product = productMap.get(productName);
      if (!product) {
        notFoundProducts.add(productName);
        continue;
      }

      // Upsert (update if exists, create if not)
      const result = await AlcoholExpense.findOneAndUpdate(
        { event: event._id, product: product._id },
        {
          $set: {
            bottlesUsed: bottlesUsed,
            totalAmount: totalAmount,
            amountPerGuest: amountPerGuest,
            eventNumber: eventNumber,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      // Check if it was created or updated
      if (result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }

      if ((created + updated) % 50 === 0) {
        console.log(`✓ Processed ${created + updated} alcohol expenses...`);
      }
    }

    console.log(`\n✅ Seed completed!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);

    if (notFoundEvents.size > 0) {
      console.log(`\n⚠️  Events not found (${notFoundEvents.size}):`);
      const eventList = Array.from(notFoundEvents).slice(0, 20);
      console.log(`   ${eventList.join(", ")}`);
      if (notFoundEvents.size > 20) {
        console.log(`   ... and ${notFoundEvents.size - 20} more`);
      }
    }

    if (notFoundProducts.size > 0) {
      console.log(`\n⚠️  Products not found (${notFoundProducts.size}):`);
      const productList = Array.from(notFoundProducts).slice(0, 20);
      productList.forEach(p => console.log(`   - ${p}`));
      if (notFoundProducts.size > 20) {
        console.log(`   ... and ${notFoundProducts.size - 20} more`);
      }
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding AlcoholExpenses:", error);
    process.exit(1);
  }
})();
