const EventActual = require("../models/EventActual");
const Event = require("../models/Events");
const EventWageShift = require("../models/EventWageShift");
const EventGeneralExpense = require("../models/EventGeneralExpense");
const AlcoholExpense = require("../models/AlcoholExpense");
const {cleanupAllNonDoneEventActuals} = require("../services/eventActualCleanupService");




// GET /api/events/actuals
exports.getAllEventActuals = async (req, res, next) => {
  try {
    await cleanupAllNonDoneEventActuals();
    const eventActuals = await EventActual.find()
      .populate({
        path: "event",
        select: "eventDate eventNumber address customerName eventType",
        populate: {
          path: "eventType",
          select: "label code"
        }
      });
    res.json({ eventActuals });
  } catch (err) {
    next(err);
  }
};









/**
 * GET /api/events/:id/actuals
 * Get event actual data
 */
exports.getEventActuals = async (req, res, next) => {
  try {
    const { id } = req.params;

    let eventActual = await EventActual.findOne({ event: id });

    if (!eventActual) {
      // Create if doesn't exist
      eventActual = await EventActual.create({ event: id });
    }

    res.json({ eventActual });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/events/:id/actuals
 * Calculate and save event actual snapshots
 */
exports.upsertEventActuals = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch all data
    const [event, wageShifts, generalExpenses, alcoholExpenses, eventActual] =
      await Promise.all([
        Event.findById(id).populate("eventType menuType"),
        EventWageShift.find({ event: id }),
        EventGeneralExpense.find({ event: id }),
        AlcoholExpense.find({ event: id }).populate("product"),
        EventActual.findOne({ event: id }),
      ]);


    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Calculate totals
    const totalWages = wageShifts.reduce((sum, s) => sum + (s.wage || 0), 0);
    const totalTips = wageShifts.reduce((sum, s) => sum + (s.tip || 0), 0);
    const totalGeneralExpenses = generalExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    );
    const totalAlcoholExpenses = alcoholExpenses.reduce((acc, e) => {
      const bottles = Number(e?.bottlesUsed) || 0;
      const price = Number(e?.product?.price) || 0;
      return acc + bottles * price;
    }, 0);

    const totalIceExpenses = eventActual?.iceExpense || 0;

    const totalExpenses =
      totalWages +
      totalGeneralExpenses +
      totalAlcoholExpenses +
      totalIceExpenses;
    const profit = (event.price || 0) - totalExpenses;
    const profitMargin = event.price ? (profit / event.price) * 100 : 0;

    // Per-head metrics
    const guestCount = event.guestCount || 1;
    const wagePerHead = totalWages / guestCount;
    const tipPerHead = totalTips / guestCount;
    const alcoholPerHead = totalAlcoholExpenses / guestCount;
    const generalExpensePerHead = totalGeneralExpenses / guestCount;
    const totalExpensePerHead = totalExpenses / guestCount;
    const revenuePerHead = (event.price || 0) / guestCount;

    // Staff metrics
    const totalStaffCount = wageShifts.length;
    const averageWagePerStaff = totalStaffCount
      ? totalWages / totalStaffCount
      : 0;
    const averageTipPerStaff = totalStaffCount
      ? totalTips / totalStaffCount
      : 0;

    // Calculate hours of operation
    let hoursOfOperation = 0;
    let wagePerHour = 0;
    if (event.startTime && event.endTime) {
      const [startH, startM] = event.startTime.split(":").map(Number);
      const [endH, endM] = event.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      hoursOfOperation = (endMinutes - startMinutes) / 60;
      if (hoursOfOperation > 0) {
        wagePerHour = totalWages / hoursOfOperation;
      }
    }

    // Prepare update data
    const updateData = {
      totalWages,
      totalTips,
      totalGeneralExpenses,
      totalAlcoholExpenses,
      totalIceExpenses,
      totalExpenses,
      profit,
      profitMargin,
      wagePerHead,
      tipPerHead,
      alcoholPerHead,
      generalExpensePerHead,
      totalExpensePerHead,
      revenuePerHead,
      guestCountSnapshot: event.guestCount,
      priceSnapshot: event.price,
      eventDateSnapshot: event.eventDate,
      eventTypeSnapshot: event.eventType?.label,
      menuTypeSnapshot: event.menuType?.label,
      totalStaffCount,
      averageWagePerStaff,
      averageTipPerStaff,
      hoursOfOperation,
      wagePerHour,
      lastSaved: new Date(),
    };

    // Upsert EventActual
    const updated = await EventActual.findOneAndUpdate(
      { event: id },
      updateData,
      { new: true, upsert: true }
    );

    res.json({
      eventActual: updated,
      message: "Event actuals saved successfully",
    });
    console.log(`Event actuals for event ID ${id} upserted successfully.`);
  } catch (err) {
    next(err);
  }
};
