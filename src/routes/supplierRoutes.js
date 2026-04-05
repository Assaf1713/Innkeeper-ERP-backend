const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { verifyToken, requireRoles } = require('../middlewares/authMiddleware');

// Apply verifyToken to all routes in this file
router.use(verifyToken);

// Basic users can view, Admin/Super Admin can manage
router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);

// Restrict creation and updates to ADMIN and SUPER_ADMIN
router.post('/', requireRoles('SUPER_ADMIN'), supplierController.createSupplier);
router.put('/:id', requireRoles('SUPER_ADMIN'), supplierController.updateSupplier);
router.delete('/:id', requireRoles('SUPER_ADMIN'), supplierController.deleteSupplier);
router.post('/:id/restore', requireRoles('SUPER_ADMIN'), supplierController.reactivateSupplier);
module.exports = router;