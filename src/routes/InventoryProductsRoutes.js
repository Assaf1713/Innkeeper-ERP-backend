const express = require("express");
const router = express.Router();
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");
const {
  listInventoryProducts,
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
  getCategories,
  ChangeVATbulkEdit,
} = require("../controllers/inventoryProductsController");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

// Change VAT to all products
router.post("/update-vat", ChangeVATbulkEdit);
// GET /api/inventory-products/categories - must come before /:id
router.get("/categories", getCategories);

// GET /api/inventory-products
router.get("/", listInventoryProducts);

// POST /api/inventory-products
router.post("/", createInventoryProduct);

// PUT /api/inventory-products/:id
router.put("/:id", updateInventoryProduct);

// DELETE /api/inventory-products/:id
router.delete("/:id", deleteInventoryProduct);

module.exports = router;
