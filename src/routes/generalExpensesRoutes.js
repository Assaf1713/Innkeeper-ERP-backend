const express = require('express');
const router = express.Router();
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

// delete a general expense by id

const { deleteGeneralExpense } = require('../controllers/generalExpensesController');
router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));
router.delete('/:id', deleteGeneralExpense);

module.exports = router;