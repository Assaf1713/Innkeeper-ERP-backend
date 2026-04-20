const mongoose = require("mongoose");
const AlcoholExpense = require("../src/models/AlcoholExpense");
const InventoryProduct = require("../src/models/InventoryProduct");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const expenses = await AlcoholExpense.find().lean();
    console.log(`Found ${expenses.length} alcohol expense records`);

    // Load all products into a map for fast lookup
    const products = await InventoryProduct.find().lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let updated = 0;
    let skipped = 0;
    let missing = 0;

    for (const expense of expenses) {
      const product = productMap.get(expense.product.toString());

      if (!product) {
        console.warn(
          `  ⚠ Product ${expense.product} not found for expense ${expense._id} — skipping`
        );
        missing++;
        continue;
      }

      const needsUpdate =
        expense.productPriceSnapshot == null ||
        expense.productLabelSnapshot == null ||
        expense.productVolumeMlSnapshot == null;

      if (!needsUpdate) {
        skipped++;
        continue;
      }

      await AlcoholExpense.updateOne(
        { _id: expense._id },
        {
          $set: {
            productPriceSnapshot: expense.productPriceSnapshot ?? product.price ?? 0,
            productLabelSnapshot: expense.productLabelSnapshot ?? product.label ?? "",
            productVolumeMlSnapshot: expense.productVolumeMlSnapshot ?? product.volumeMl ?? 0,
          },
        }
      );
      updated++;
    }

    console.log(`\nDone!`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped (already has snapshots): ${skipped}`);
    console.log(`  Missing product (skipped): ${missing}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
