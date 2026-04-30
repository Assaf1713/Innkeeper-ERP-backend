const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { verifyToken, requireRoles } = require('../middlewares/authMiddleware');

// Apply verifyToken to all routes
router.use(verifyToken);

// only ADMIN and SUPER_ADMIN can access reports | supports URL query params for date range: ?startDate=2024-01-01&endDate=2024-01-31
router.get('/cash-flow', requireRoles('ADMIN', 'SUPER_ADMIN'), reportsController.getCashFlowReport);

module.exports = router;