// Expense category constants extracted from data
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
  RENT: "שכירות",
  INSURANCE: "ביטוח",
};

// Get all categories as array
const getAllCategories = () => Object.values(EXPENSE_CATEGORIES);

// Get category by key
const getCategoryByKey = (key) => EXPENSE_CATEGORIES[key];

// Find category key by value
const getCategoryKey = (value) => {
  return Object.keys(EXPENSE_CATEGORIES).find(
    (key) => EXPENSE_CATEGORIES[key] === value
  );
};

module.exports = {
  EXPENSE_CATEGORIES,
  getAllCategories,
  getCategoryByKey,
  getCategoryKey,
};