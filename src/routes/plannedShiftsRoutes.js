// planned-shifts routes.js
const express = require('express');
const router = express.Router();
const  {updatePlannedShift, deletePlannedShift} = require('../controllers/plannedShiftController');
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

// PUT /api/planned-shifts/:id
router.put('/:id', updatePlannedShift);
// DELETE /api/planned-shifts/:id
router.delete('/:id', deletePlannedShift);

module.exports = router;