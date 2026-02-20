/* eslint-disable no-console */
const mongoose = require("mongoose");
const GeneralExpenseType = require("../src/models/GeneralExpenseType");
require("dotenv").config();
const MONGO_URI = process.env.MONGO_URI;

// ====== DATA ======
const expenseCategoriesSeed = [
  "סופר",
  "שוק",
  "פרחים",
  "כשרות",
  "קרח-חירום",
  "ארוחות",
  "השכרת כוסות",
  "מיתוג",
  "חניה",
  "השכרת ציוד",
  "מלאי-חירום",
  "משקאות לאירוע",
  "נסיעות",
];

// ====== HELPERS ======
const slugify = (label) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

// ====== SEED ======
async function run() {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");
    await mongoose.connect(MONGO_URI);
    console.log("🌱 Seeding GeneralExpenseTypes...");

    const ops = expenseCategoriesSeed.map((label) => {
      const code = slugify(label);

      return {
        updateOne: {
          filter: { code },
          update: {
            $setOnInsert: {
              code,
              label,
              isActive: true,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await GeneralExpenseType.bulkWrite(ops);

    console.log("✅ Seed completed");
    console.log("Inserted:", result.upsertedCount);
    console.log("Matched:", result.matchedCount);
  } catch (err) {
    console.error("❌ Seed failed", err);
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = run;
if (require.main === module) {
  run();
}
