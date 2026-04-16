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
router.patch('/:id/actual-price', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.updateActualPrice);
router.patch('/:id/set-payment', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.setPayment);
// Add / Remove / Update items in an order
router.post('/:id/items', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.addOrderItem);
router.patch('/:id/items/:itemId', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.updateOrderItem);
router.delete('/:id/items/:itemId', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.removeOrderItem);
router.delete('/:id', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.deleteOrder);
router.delete('/:id/remove-related-event', requireRoles('ADMIN', 'SUPER_ADMIN'), purchaseOrderController.removeRelatedEvent);

module.exports = router;