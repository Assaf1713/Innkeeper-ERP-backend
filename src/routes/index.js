const express = require('express');
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");


router.get('/health', (req, res) => {
    res.json({status: 'OK', timestamp: new Date().toISOString()});
})



// Authentication routes
router.post("/auth/login", authController.login);
router.post(
    "/auth/register",
    verifyToken,
    requireRoles("SUPER_ADMIN"),
    authController.register
    );
router.use('/users', require('./userRoutes'));
router.use('/expenses',require('./expensesRoutes'));
router.use('/events', require('./eventsRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/lookups', require('./lookupsRoutes'));
router.use('/employees', require('./employeeRoutes'));
router.use('/customers', require('./customerRoutes'));
// routers for the planned shifts in the event details page
router.use('/plannedShifts', require('./plannedShiftsRoutes'));
// routers for the wage shifts in the event details page
router.use('/wage-shifts', require('./wageShiftsRoutes'));
// router for general expenses in the event details page
router.use('/general-expenses', require('./generalExpensesRoutes'));
// router for general expense types in the event details page
router.use('/general-expense-types', require('./generalExpensesTypeRoutes'));
// router for Alcohol expenses in the done event section
router.use('/alcohol-expenses', require('./alcoholExpensesRoutes'));
// router for inventory products
router.use('/inventory-products', require('./InventoryProductsRoutes'));
// router for leads
router.use('/leads', require('./leadsRoutes'));
// router for unavailable dates
router.use('/unavailable-dates', require('./UnavailableDatesRoutes'));

// router for pricing rules
// router.use('/pricing-rules', require('./pricingRulesRoutes'));

// router for pricing analysis
router.use('/pricing', require('./pricingRoutes'));

// router for settings
router.use('/settings', require('./settingsRoutes'));

module.exports = router;

