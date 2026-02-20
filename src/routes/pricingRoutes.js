const express = require("express");
const router = express.Router();
const { getPricingAnalysis } = require("../controllers/pricingController");
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

// GET /api/pricing/analysis?eventTypeCode=PRIVATE_COCKTAIL&guestCount=100
router.get("/analysis", getPricingAnalysis);

module.exports = router;
