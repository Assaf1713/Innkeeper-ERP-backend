const express = require('express');
const router = express.Router();
const { getAdmin } = require('../controllers/adminController');
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

router.get('/', getAdmin);
module.exports = router;