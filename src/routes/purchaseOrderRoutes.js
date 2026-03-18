const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { verifyToken, requireRoles } = require('../middlewares/authMiddleware');

// Apply verifyToken to all routes
router.use(verifyToken);

// All roles can view orders
router.get('/', purchaseOrderController.getOrders);
router.get('/:id', purchaseOrderController.getOrderById);

// Restrict creation and modifications to ADMIN and SUPER_ADMIN
router.post('/', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.createOrder);
router.put('/:id', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.updateOrder);
router.patch('/:id/status', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.updateOrderStatus);

module.exports = router;