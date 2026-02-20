const express = require('express');
const router = express.Router();
const  {getUnavailableDates, addUnavailableDate, removeUnavailableDate} = require('../controllers/unavailableDatesController');
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));
// GET /api/unavailable-dates/
router.get('/', getUnavailableDates);
// POST /api/unavailable-dates/
router.post('/', addUnavailableDate);
// DELETE /api/unavailable-dates/:id
router.delete('/:id', removeUnavailableDate);


module.exports = router;