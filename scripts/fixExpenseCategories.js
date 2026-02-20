require("dotenv").config();
const mongoose = require("mongoose");
const Expense = require("../src/models/Expenses");
const { getAllCategories } = require("../src/constants/expenseCategories");

async function fixExpenseCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const validCategories = getAllCategories();
    console.log("Valid categories:", validCategories);

    // Get all expenses
    const allExpenses = await Expense.find();
    console.log(`\nTotal expenses: ${allExpenses.length}`);

    let invalidCount = 0;
    let rentalCount = 0;
    let insuranceCount = 0;

    // First pass: Find invalid categories
    const invalidExpenses = [];
    for (const expense of allExpenses) {
      if (!validCategories.includes(expense.category)) {
        invalidCount++;
        invalidExpenses.push({
          _id: expense._id,
          name: expense.name,
          category: expense.category,
        });
      }
    }

    console.log(`\nFound ${invalidCount} expenses with invalid categories`);
    if (invalidExpenses.length > 0) {
      console.log("\nInvalid categories found:");
      const uniqueInvalid = [...new Set(invalidExpenses.map(e => e.category))];
      uniqueInvalid.forEach(cat => {
        const count = invalidExpenses.filter(e => e.category === cat).length;
        console.log(`  - "${cat}": ${count} expenses`);
      });
    }

    // Fix invalid categories to LOGISTICS (לוגיסטיקה)
    if (invalidCount > 0) {
      const result = await Expense.updateMany(
        { category: { $nin: validCategories } },
        { $set: { category: "לוגיסטיקה" } }
      );
      console.log(`\nFixed ${result.modifiedCount} expenses to "לוגיסטיקה" (default)`);
    }

    // Search for rental-related expenses by name patterns
    const rentalPatterns = [
      /שכירות/i,
      /השכרה/i,
      /שוכר/i,
      /rent/i,
      /אולם/i,
      /מקום/i,
    ];

    for (const pattern of rentalPatterns) {
      const expenses = await Expense.find({
        name: pattern,
        category: { $ne: "שכירות" },
      });
      
      if (expenses.length > 0) {
        const ids = expenses.map(e => e._id);
        await Expense.updateMany(
          { _id: { $in: ids } },
          { $set: { category: "שכירות" } }
        );
        rentalCount += expenses.length;
        console.log(`\nFound ${expenses.length} rental expenses matching "${pattern}"`);
        expenses.forEach(e => console.log(`  - ${e.name}`));
      }
    }

    // Search for insurance-related expenses by name patterns
    const insurancePatterns = [
      /ביטוח/i,
      /insurance/i,
      /ביט/i,
    ];

    for (const pattern of insurancePatterns) {
      const expenses = await Expense.find({
        name: pattern,
        category: { $ne: "ביטוח" },
      });
      
      if (expenses.length > 0) {
        const ids = expenses.map(e => e._id);
        await Expense.updateMany(
          { _id: { $in: ids } },
          { $set: { category: "ביטוח" } }
        );
        insuranceCount += expenses.length;
        console.log(`\nFound ${expenses.length} insurance expenses matching "${pattern}"`);
        expenses.forEach(e => console.log(`  - ${e.name}`));
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Invalid categories fixed: ${invalidCount}`);
    console.log(`Expenses categorized as rental (שכירות): ${rentalCount}`);
    console.log(`Expenses categorized as insurance (ביטוח): ${insuranceCount}`);

    // Verify all categories are now valid
    const stillInvalid = await Expense.find({
      category: { $nin: validCategories },
    });

    if (stillInvalid.length > 0) {
      console.log(`\n⚠️ WARNING: Still found ${stillInvalid.length} invalid categories!`);
      stillInvalid.forEach(e => {
        console.log(`  - ${e.name}: "${e.category}"`);
      });
    } else {
      console.log("\n✓ All expense categories are now valid!");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

fixExpenseCategories();
