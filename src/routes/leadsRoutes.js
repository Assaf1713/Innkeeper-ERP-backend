const leadsController = require('../controllers/leadsController');
const express = require('express');
const router = express.Router();
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.post('/webhook', leadsController.createLeadFromWebhook);

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

router.post('/', leadsController.createLead);
router.get('/', leadsController.ListLeads);
router.put('/:id', leadsController.updateLeadData);
router.delete('/:id', leadsController.deleteLead);

module.exports = router;