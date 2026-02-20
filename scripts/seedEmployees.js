const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const Employee = require("../src/models/Employee");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;



(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "employees.csv");

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

    let created = 0;
    let skipped = 0;

    for (const r of records) {
      const name = String(r["name"] || "").trim();
      const defaultRole = String(r["defaultRole"] || "").trim();
  

      // Skip empty rows
      if (!name) {
        continue;
      }

      // Check if Employee already exists
      const existing = await Employee.findOne({ name });
      if (existing) {
        console.log(`Employee "${name}"  already exists, skipping.`);
        skipped++;
        continue;
      }

      // Create new Employee
      const newEmployee = new Employee({
        name,
        defaultRole,
        isActive:true,
      });

      await newEmployee.save();
      console.log(`✓ Employee "${name}"  added.`);
      created++;
    }

    console.log(`\n✅ Seed completed!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding Employees:", error);
    process.exit(1);
  }
})();