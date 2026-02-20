// Inventory product category constants extracted from data
const INVENTORY_PRODUCT_CATEGORIES = {
  OUZO: "אוזו",
  TEQUILA: "טקילה",
  GIN: "ג'ין",
  APEROL: "אפרול",
  WHISKEY: "וויסקי",
  BEER: "בירה",
  VODKA: "וודקה",
  RUM: "רום",
  LIQUEUR: "ליקר",
  FLAVORED_VODKA: "וודקה טעמים",
  RED_WINE: "יין אדום",
  WHITE_WINE: "יין לבן",
  ROSE_WINE: "יין רוזה",
  VERMOUTH: "וורמוט",
  WATER: "מים",
  SODA: "סודה",
  ARAK: "ערק ",
  SPARKLING_WINE: "יין מבעבע",
  CAMPARI: "קמפרי",
};

// Get all categories as array
const getAllCategories = () => Object.values(INVENTORY_PRODUCT_CATEGORIES);

// Get category by key
const getCategoryByKey = (key) => INVENTORY_PRODUCT_CATEGORIES[key];

// Find category key by value
const getCategoryKey = (value) => {
  return Object.keys(INVENTORY_PRODUCT_CATEGORIES).find(
    (key) => INVENTORY_PRODUCT_CATEGORIES[key] === value
  );
};

module.exports = {
  INVENTORY_PRODUCT_CATEGORIES,
  getAllCategories,
  getCategoryByKey,
  getCategoryKey,
};
