const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const Customer = require("../src/models/Customers");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

function parseBoolean(value) {
  if (!value) return false;
  const v = String(value).toLowerCase().trim();
  return v === "yes" || v === "business" || v === "true" || v === "1";
}

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "seed customers.csv");

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
      const isBusiness = parseBoolean(r["IsBusiness"]);
      const payingCustomer = parseBoolean(r["payingCustomer"]);

      // Skip empty rows
      if (!name || !email) {
        continue;
      }

      // Check if customer already exists
      const existing = await Customer.findOne({ email });
      if (existing) {
        console.log(`Customer "${name}" (${email}) already exists, skipping.`);
        skipped++;
        continue;
      }

      // Create new customer
      const newCustomer = new Customer({
        name,
        email,
        IsBusiness: isBusiness,
        payingCustomer,
        isActive: true,
        company: "", // blank as requested
        companyId: "", // blank as requested
        phone: "", // blank as requested
      });

      await newCustomer.save();
      console.log(`✓ Customer "${name}" (${email}) added.`);
      created++;
    }

    console.log(`\n✅ Seed completed!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding customers:", error);
    process.exit(1);
  }
})();