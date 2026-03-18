const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const suppliers = require('../src/models/Supplier');
require("dotenv").config();


const MONGO_URI = process.env.MONGO_URI;

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "suppliers.csv");

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
      const email = String(r["email"] || "").trim();
      const phone = String(r["phone"] || "").trim();
      const account_name = String(r["account_name"] || "").trim();
      const account_number = String(r["account_number"] || "").trim();
      const account_bank_number = String(r["account_bank_number"] || "").trim();
      const account_branch_number = String(r["account_branch_number"] || "").trim();
        // Skip empty rows
        if (!name) {
            continue;
        }

        // Check if Supplier already exists
        const existing = await suppliers.findOne({ name });
        if (existing) {
            console.log(`Supplier "${name}"  already exists, skipping.`);
            skipped++;
            continue;
        }

        // Create new Supplier
        const newSupplier = new suppliers({
            name,
            email,
            phone,
            account_name,
            account_number,
            account_bank_number,
            account_branch_number,
        });

        await newSupplier.save();
        console.log(`Supplier "${name}" created.`);
        created++;
    }

    console.log(`Seeding completed. Created: ${created}, Skipped: ${skipped}`);
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding suppliers:", error);
    process.exit(1);
  }
})();