const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const EventGeneralExpense = require("../src/models/EventGeneralExpense");
const GeneralExpenseType = require("../src/models/GeneralExpenseType");
const Event = require("../src/models/Events");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

// Helper function from generalExpensesTypeController
const slugify = (label) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "cleaned_general_expenses.csv");

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

    // Cache all expense types and events to avoid repeated DB queries
    const allExpenseTypes = await GeneralExpenseType.find({});
    const expenseTypeMap = new Map(
      allExpenseTypes.map((type) => [type.label.trim(), type])
    );

    const allEvents = await Event.find({});
    const eventMap = new Map(
      allEvents.map((evt) => [evt.eventNumber, evt])
    );

    let created = 0;
    let notFoundEvents = new Set();
    let createdExpenseTypes = 0;
    let mappedCount = 0;

    for (const r of records) {
      const eventNumber = parseInt(r["eventNumber"]);
      const expenseTypeLabel = String(r["expenseTypeLabel"] || "").trim();
      const amount = parseFloat(r["amount"] || 0);

      // Skip empty rows
      if (!eventNumber || !expenseTypeLabel || !amount) {
        continue;
      }

      // Find the event
      const event = eventMap.get(eventNumber);
      if (!event) {
        notFoundEvents.add(eventNumber);
        continue;
      }

      // Find the expense type or create it if it doesn't exist
      let expenseType = expenseTypeMap.get(expenseTypeLabel);
      
      if (!expenseType) {
        // Expense type not found, create it
        const code = slugify(expenseTypeLabel);
        
        try {
          expenseType = await GeneralExpenseType.create({
            code: code,
            label: expenseTypeLabel,
            isActive: true,
          });
          
          // Add to map for future use in this run
          expenseTypeMap.set(expenseTypeLabel, expenseType);
          createdExpenseTypes++;
          
          console.log(`  → Created new expense type: "${expenseTypeLabel}" (code: ${code})`);
        } catch (err) {
          // If duplicate code error, try to find by code
          if (err?.code === 11000) {
            expenseType = await GeneralExpenseType.findOne({ code });
            if (expenseType) {
              expenseTypeMap.set(expenseTypeLabel, expenseType);
            } else {
              console.error(`  ✗ Failed to create/find expense type: ${expenseTypeLabel}`);
              continue;
            }
          } else {
            throw err;
          }
        }
      } else {
        mappedCount++;
      }

      // Create new EventGeneralExpense
      const newGeneralExpense = new EventGeneralExpense({
        event: event._id,
        expenseType: expenseType._id,
        amount: amount,
        expenseTypeCodeSnapshot: expenseType.code,
        expenseTypeLabelSnapshot: expenseTypeLabel, // Keep original label from CSV
      });

      await newGeneralExpense.save();
      created++;

      if (created % 50 === 0) {
        console.log(`✓ Processed ${created} general expenses...`);
      }
    }

    console.log(`\n✅ Seed completed!`);
    console.log(`   Created: ${created}`);
    console.log(`   Mapped to existing types: ${mappedCount}`);
    console.log(`   Created new expense types: ${createdExpenseTypes}`);

    if (notFoundEvents.size > 0) {
      console.log(`\n⚠️  Events not found (${notFoundEvents.size}):`);
      const eventList = Array.from(notFoundEvents).slice(0, 20);
      console.log(`   ${eventList.join(", ")}`);
      if (notFoundEvents.size > 20) {
        console.log(`   ... and ${notFoundEvents.size - 20} more`);
      }
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding GeneralExpenses:", error);
    process.exit(1);
  }
})();
