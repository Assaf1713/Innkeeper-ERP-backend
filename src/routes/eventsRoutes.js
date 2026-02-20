const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");
const {
  listEvents,
  seedOneEvent,
  createEvent,
  getEventById,
  updateEvent,
  updateIceExpenses,
  ListofClosedEventsDates,
} = require("../controllers/eventsController");
const {
  getPlannedShiftsByEventId,
  createPlannedShift,
} = require("../controllers/plannedShiftController");
const {
  getEventActuals,
  upsertEventActuals,
  getAllEventActuals,
} = require("../controllers/eventActualsController");
const {
  listWageShifts,
  createWageShift,
  importPlannedShifts,
  markAllShiftsAsPaid,
} = require("../controllers/eventWageShiftsController");

const {
  listGeneralExpenses,
  createGeneralExpense,
} = require("../controllers/eventGeneralExpensesController");

const {
  listAlcoholExpenses,
  upsertAlcoholExpense,
} = require("../controllers/alcoholExpensesController");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));


// Ice Expenses Route
router.put("/:id/ice-expenses", updateIceExpenses);

// Event Alcohol Expenses Routes
router.get("/:id/alcohol-expenses", listAlcoholExpenses);
router.put("/:id/alcohol-expenses", upsertAlcoholExpense);

// Event General Expenses routes
router.get("/:id/general-expenses", listGeneralExpenses);
router.post("/:id/general-expenses", createGeneralExpense);


// Wage Shifts routes
router.get("/:id/wage-shifts", listWageShifts);
router.post("/:id/wage-shifts", createWageShift);
router.post("/:id/wage-shifts/import-planned", importPlannedShifts);
router.put("/:id/wage-shifts/mark-all-paid", markAllShiftsAsPaid);

// Event Actuals routes
router.get("/:id/actuals", getEventActuals);
router.put("/:id/actuals", upsertEventActuals);
// GET /api/events

router.get("/", listEvents);
router.post("/", upload.none(), createEvent);
router.post("/seed", seedOneEvent);

// GET /api/events/actuals get all event actuals
router.get("/actuals", getAllEventActuals);

// GET /api/events/closed-dates (must come before /:id route)
router.get("/closed-dates", ListofClosedEventsDates);

router.get("/:id", getEventById);
router.put("/:id", updateEvent);
// GET /api/events/:eventId/planned-shifts
router.get("/:eventId/planned-shifts", getPlannedShiftsByEventId);
// POST /api/events/:eventId/planned-shifts
router.post("/:eventId/planned-shifts", createPlannedShift);
// POST /api/events/:id/close-details
const { saveCloseEventDetails } = require("../controllers/eventsController");
router.post("/:id/close-details", upload.none(), saveCloseEventDetails);

module.exports = router;
