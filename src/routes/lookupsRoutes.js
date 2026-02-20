const express = require("express");
const router = express.Router();
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

const EventType = require("../models/EventType");
const LeadSource = require("../models/LeadSource");
const MenuType = require("../models/MenuType");
const EventStatus = require("../models/EventStatus");
const { createGeneralExpenseType, listGeneralExpenseTypes } = require("../controllers/generalExpensesTypeController");
const {
  listInventoryProducts,
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
} = require("../controllers/inventoryProductsController");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

router.get("/", async (req, res, next) => {
  try {
    const [eventTypes, leadSources, menuTypes, statuses] = await Promise.all([
      EventType.find({ isActive: true }).select("code label").sort({ label: 1 }),
      LeadSource.find({ isActive: true }).select("code label").sort({ label: 1 }),
      MenuType.find({ isActive: true }).select("code label").sort({ label: 1 }),
      EventStatus.find({ isActive: true }).select("code label").sort({ code: 1 }),
    ]);

    res.json({ eventTypes, leadSources, menuTypes, statuses });
  } catch (err) {
    next(err);
  }
});

// POST / api/lookups/expenses types
router.post("/general-expense-types", createGeneralExpenseType);

// GET / api/lookups/expenses types
router.get("/general-expense-types", listGeneralExpenseTypes);

// Inventory Products CRUD

router.get("/inventory-products", listInventoryProducts);
router.post("/inventory-products", createInventoryProduct);
router.put("/inventory-products/:id", updateInventoryProduct);
router.delete("/inventory-products/:id", deleteInventoryProduct);



module.exports = router;
