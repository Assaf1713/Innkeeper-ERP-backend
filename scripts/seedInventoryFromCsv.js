const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const InventoryProduct = require("../src/models/InventoryProduct");
require("dotenv").config();


const MONGO_URI = process.env.MONGO_URI;

function toNumber(val) {
  if (val === null || val === undefined) return 0;
  const s = String(val)
    .replace(/[^\d.]/g, "")
    .trim(); // מסיר ₪ ורווחים
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "alcohol-prices.csv");

    console.log("cwd:", process.cwd());
    console.log("__dirname:", __dirname);
    console.log("csvPath:", csvPath);

    const raw = fs.readFileSync(csvPath, "utf8");

    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });

    await mongoose.connect(MONGO_URI);

    let upserts = 0;

    for (const r of records) {
      // שמות עמודות לפי ה-CSV שלך (כולל " NET PRICE " עם רווחים)
      const code = String(r["CODE"]).trim();
      const label = String(r["LABEL"] ?? "").trim();
      const category = String(r["CATEGORY"] ?? "").trim();
      const menuTypeLabel = String(r["MENU TYPE"] ?? "").trim();

      const volumeMl = toNumber(r["VOLUME"]);
      const price = toNumber(r["PRICE"]);
      const netPrice = toNumber(r[" NET PRICE "]); // שים לב לרווחים בשם העמודה

      if (!code || !label) continue;

      await InventoryProduct.updateOne(
        { code },
        {
          $set: {
            code,
            label,
            category,
            menuTypeLabel,
            volumeMl,
            price,
            netPrice,
            isActive: true,
          },
        },
        { upsert: true }
      );

      upserts++;
    }

    console.log(`✅ Seed done. Upserted: ${upserts} products`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
})();
