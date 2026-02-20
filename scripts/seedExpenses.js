const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Expense = require("../src/models/Expenses");

// Category mapping for future use
const EXPENSE_CATEGORIES = {
  MANAGEMENT: "מנהלי",
  GLASSES: "כוסות",
  ADVERTISING: "פרסום",
  LOGISTICS: "לוגיסטיקה",
  FUEL: "דלק",
  ICE: "קרח",
  LEMON_JUICE: "מיץ לימון",
  INVENTORY: "מלאי",
  FOOD_BEVERAGES: "מזון ומשקאות",
  MUNICIPALITY: "ערייה וממשלה",
  INVENTORY_IMPORTER: "מלאי מהיבואן",
  EMERGENCY_INVENTORY: "מלאי חירום",
};

// Function to parse DD/MM/YYYY to Date object
function parseDate(dateStr) {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}

// Function to parse boolean string
function parseBoolean(str) {
  return str.toUpperCase() === "TRUE";
}
// Better CSV parser that handles quoted fields with escaped quotes
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote ("")
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function seedExpenses() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/bar-mis";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Clear existing expenses
    const deleteResult = await Expense.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing expenses`);

    // Read CSV file
    const csvPath = path.join(__dirname, "../data/clean_expenses.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    // Parse CSV
    const lines = csvContent.split("\n");
    const headers = lines[0].split(",");

    const expenses = [];


    // Skip header row and process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const cleanValues = parseCSVLine(line);

      if (cleanValues.length < 7) continue; // Skip invalid rows

      const expense = {
        name: cleanValues[0].trim(),
        supplier: cleanValues[1].trim(),
        category: cleanValues[2].trim(),
        date: parseDate(cleanValues[3].trim()),
        price: parseFloat(cleanValues[4].trim()) || 0,
        notes: cleanValues[5].trim() || "",
        waspaid: parseBoolean(cleanValues[6].trim()),
      };

      expenses.push(expense);
    }

    // Insert all expenses
    const result = await Expense.insertMany(expenses);
    console.log(`✓ Successfully seeded ${result.length} expenses`);

    // Extract and display unique categories
    const categories = [...new Set(expenses.map((e) => e.category))].sort();
    console.log("\n=== Unique Categories ===");
    categories.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat}`);
    });

    // Generate category constants
    console.log("\n=== Category Constants for Code ===");
    categories.forEach((cat) => {
      const constName = cat
        .replace(/\s+/g, "_")
        .replace(/"/g, "")
        .toUpperCase()
        .replace(/[^\w]/g, "_");
      console.log(`${constName}: "${cat}",`);
    });

    // Statistics
    const totalAmount = expenses.reduce((sum, e) => sum + e.price, 0);
    const paidAmount = expenses
      .filter((e) => e.waspaid)
      .reduce((sum, e) => sum + e.price, 0);
    const unpaidAmount = expenses
      .filter((e) => !e.waspaid)
      .reduce((sum, e) => sum + e.price, 0);

    console.log("\n=== Statistics ===");
    console.log(`Total expenses: ${expenses.length}`);
    console.log(`Total amount: ₪${totalAmount.toLocaleString("he-IL")}`);
    console.log(`Paid amount: ₪${paidAmount.toLocaleString("he-IL")}`);
    console.log(`Unpaid amount: ₪${unpaidAmount.toLocaleString("he-IL")}`);
    console.log(
      `Date range: ${expenses[0].date.toLocaleDateString("he-IL")} - ${expenses[
        expenses.length - 1
      ].date.toLocaleDateString("he-IL")}`
    );

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding expenses:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedExpenses();
}

module.exports = { seedExpenses, EXPENSE_CATEGORIES };
