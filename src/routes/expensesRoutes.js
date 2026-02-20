const express = require('express');
const router = express.Router();
const { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  getCategories 
} = require('../controllers/expensesController');
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken);

// Get categories first (before :id routes)
router.get('/categories', requireRoles("SUPER_ADMIN", "ADMIN"), getCategories);

// CRUD routes
router.get('/', requireRoles("SUPER_ADMIN", "ADMIN"), getExpenses);
router.post('/', requireRoles("SUPER_ADMIN", "ADMIN"), createExpense);
router.put('/:id', requireRoles("SUPER_ADMIN"), updateExpense);
router.delete('/:id', requireRoles("SUPER_ADMIN"), deleteExpense);

module.exports = router;
