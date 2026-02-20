// this route defines the API endpoints for employee-related operations
const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));
// GET /api/employees
router.get("/", employeeController.getAllEmployees);
// GET /api/employees/:id/wage-shifts
router.get("/:id/wage-shifts", employeeController.getEmployeeWageShifts);
// GET /api/employees/:id/planned-shifts
router.get("/:id/planned-shifts", employeeController.getEmployeePlannedShifts);
// GET /api/employees/:id
router.get("/:id", employeeController.getEmployeeById);
// POST /api/employees
router.post("/", employeeController.createEmployee);
// PUT /api/employees/:id
router.put("/:id", employeeController.updateEmployee);
// DELETE /api/employees/:id
router.delete("/:id", employeeController.deleteEmployee);
// Additional endpoints

module.exports = router;
