const mongoose = require("mongoose");
const Event = require("../src/models/Events");
const EventActual = require("../src/models/EventActual");
const EventWageShift = require("../src/models/EventWageShift");
const EventGeneralExpense = require("../src/models/EventGeneralExpense");
const AlcoholExpense = require("../src/models/AlcoholExpense");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

/**
 * Recalculate event actuals for a single event
 * This is the same logic as in eventActualsController.upsertEventActuals
 */
async function recalculateEventActual(eventId) {
  try {
    // Fetch all data
    const [event, wageShifts, generalExpenses, alcoholExpenses, eventActual] =
      await Promise.all([
        Event.findById(eventId).populate("eventType menuType"),
        EventWageShift.find({ event: eventId }),
        EventGeneralExpense.find({ event: eventId }),
        AlcoholExpense.find({ event: eventId }).populate("product"),
        EventActual.findOne({ event: eventId }),
      ]);

    if (!event) {
      console.log(`Event ${eventId} not found, skipping...`);
      return;
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
    await EventActual.findOneAndUpdate({ event: eventId }, updateData, {
      new: true,
      upsert: true,
    });

    console.log(
      `✓ Recalculated actuals for event #${event.eventNumber} (${eventId})`
    );
    console.log(`  Total Alcohol Expenses: ₪${totalAlcoholExpenses.toFixed(2)}`);
    console.log(`  Total Expenses: ₪${totalExpenses.toFixed(2)}`);
    console.log(`  Profit: ₪${profit.toFixed(2)}`);
  } catch (err) {
    console.error(`Error recalculating event ${eventId}:`, err);
  }
}

/**
 * Main script - recalculate all DONE event actuals
 */
(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Find all events with status "DONE"
    const Status = require("../src/models/EventStatus");
    const doneStatus = await Status.findOne({ code: "DONE" });

    if (!doneStatus) {
      console.log("No DONE status found in database");
      await mongoose.disconnect();
      process.exit(0);
    }

    const doneEvents = await Event.find({ status: doneStatus._id }).select(
      "_id eventNumber"
    );

    console.log(`\nFound ${doneEvents.length} DONE events to recalculate\n`);

    // Recalculate each event
    for (const event of doneEvents) {
      await recalculateEventActual(event._id);
    }

    console.log(
      `\n✓ Successfully recalculated ${doneEvents.length} event actuals`
    );

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();