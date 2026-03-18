const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const InventoryProduct = require("../src/models/InventoryProduct");
const Supplier = require("../src/models/Supplier");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

function toNumber(val) {
  if (val === null || val === undefined) return 0;
  const s = String(val).replace(/[^\d.]/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "inventory_products.csv");

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

    // Build a supplier name → _id lookup map
    const allSuppliers = await Supplier.find({});
    const supplierMap = {};
    for (const s of allSuppliers) {
      supplierMap[s.name.trim()] = s._id;
    }

    let created = 0;
    let skipped = 0;

    for (const r of records) {
      const label = String(r["label"] || "").trim();
      const superCategory = String(r["superCategory"] || "").trim();
      const volumeMl = toNumber(r["volumeMl"]);
      const supplierName = String(r["supplier"] || "").trim();
      const notes = String(r["notes"] || "").trim();
      const netPrice = toNumber(r["netPrice"]);
      const defaultForWorkRaw = String(r["defaultforWork"] || "").trim().toUpperCase();
      const defaultForWork = defaultForWorkRaw === "TRUE";

      // Skip empty rows
      if (!label) {
        skipped++;
        continue;
      }

      // Resolve supplier ObjectId by name
      const supplierId = supplierMap[supplierName] || null;
      if (supplierName && !supplierId) {
        console.warn(`⚠️  Supplier "${supplierName}" not found for product "${label}"`);
      }

      // Generate a unique code from label + supplier
      const code = `${label}__${supplierName || "none"}`;

      // Check if product already exists
      const existing = await InventoryProduct.findOne({ code });
      if (existing) {
        skipped++;
        continue;
      }

      await InventoryProduct.create({
        code,
        label,
        superCategory: superCategory || "GENERAL",
        volumeMl,
        supplier: supplierId,
        notes,
        netPrice,
        defaultForWork,
        isActive: true,
      });

      created++;
    }

    console.log(`✅ Seed done. Created: ${created}, Skipped: ${skipped}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
})();
