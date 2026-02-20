const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

router.get("/", customerController.listCustomers);
router.post("/", customerController.createCustomer);
router.get("/:id", customerController.getCustomer);
router.put("/:id", customerController.updateCustomer);
router.delete("/:id", customerController.deleteCustomer);
// serach customer by email
router.get("/search/:email", customerController.SearchCustomerByEmail);

module.exports = router;