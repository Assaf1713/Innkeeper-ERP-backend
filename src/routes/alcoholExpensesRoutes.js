
const express = require("express");
const router = express.Router();

const { deleteAlcoholExpense } = require("../controllers/alcoholExpensesController");
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

// DELETE /api/alcohol-expenses/:id
router.delete("/:id", deleteAlcoholExpense);

module.exports = router;
