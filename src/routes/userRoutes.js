const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");



// Get user by employee ID
router.get("/employee/:employeeId", verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"), userController.getUserbyEmployeeID);

router.use(verifyToken, requireRoles("SUPER_ADMIN"));

// Create user for an existing employee
router.post("/", userController.createUser);

// Update username/role/password
router.put("/:id", userController.updateUser);

// Change password
router.patch("/:id/password", userController.changePassword);


module.exports = router;
