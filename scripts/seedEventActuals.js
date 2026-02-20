const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const EventActual = require("../src/models/EventActual");
const Event = require("../src/models/Events");
const EventWageShift = require("../src/models/EventWageShift");
const EventGeneralExpense = require("../src/models/EventGeneralExpense");
const AlcoholExpense = require("../src/models/AlcoholExpense");
const InventoryProduct = require("../src/models/InventoryProduct");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "cleaned_event_actuals.csv");

    console.log("Reading CSV from:", csvPath);

    const raw = fs.readFileSync(csvPath, "utf8");

    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Cache all events
    const allEvents = await Event.find({});
    const eventMap = new Map(
      allEvents.map((evt) => [evt.eventNumber, evt])
    );

    let created = 0;
    let updated = 0;
    let notFoundEvents = new Set();

    for (const r of records) {
      const eventNumber = parseInt(r["eventNumber"]);
      const csvTotalWages = parseFloat(r["totalWages"] || 0);
      const csvTotalTips = 0; // Tips are included in wages in this CSV
      const csvGeneralExpenses = parseFloat(r["totalGeneralExpenses"] || 0);
      const csvAlcoholCost = parseFloat(r["totalAlcoholExpenses"] || 0);
      const csvIceCost = parseFloat(r["iceExpense"] || 0);
      const csvRevenue = parseFloat(r["הכנסות"] || 0);
      const carType = String(r["carType"] || "").trim() || "transporter";

      // Skip empty rows
      if (!eventNumber) {
        continue;
      }

      // Find the event
      const event = eventMap.get(eventNumber);
      if (!event) {
        notFoundEvents.add(eventNumber);
        continue;
      }

      // Fetch all related data for this event
      const [wageShifts, generalExpenses, alcoholExpenses, existingActual] =
        await Promise.all([
          EventWageShift.find({ event: event._id }),
          EventGeneralExpense.find({ event: event._id }),
          AlcoholExpense.find({ event: event._id }).populate("product"),
          EventActual.findOne({ event: event._id }),
        ]);

      // Calculate totals with DB-first, CSV-fallback logic
      
      // Wages: Sum from DB, fallback to CSV
      const dbTotalWages = wageShifts.reduce((sum, s) => sum + (s.wage || 0), 0);
      const totalWages = dbTotalWages > 0 ? dbTotalWages : csvTotalWages;

      // Tips: Sum from DB, fallback to CSV (0 in this case)
      const dbTotalTips = wageShifts.reduce((sum, s) => sum + (s.tip || 0), 0);
      const totalTips = dbTotalTips > 0 ? dbTotalTips : csvTotalTips;

      // General Expenses: Sum from DB, fallback to CSV
      const dbGeneralExpenses = generalExpenses.reduce(
        (sum, e) => sum + (e.amount || 0),
        0
      );
      const totalGeneralExpenses = dbGeneralExpenses > 0 ? dbGeneralExpenses : csvGeneralExpenses;

      // Alcohol: Sum from DB, fallback to CSV
      const dbAlcoholExpenses = alcoholExpenses.reduce((acc, e) => {
        const bottles = Number(e?.bottlesUsed) || 0;
        const price = Number(e?.product?.price) || 0;
        return acc + bottles * price;
      }, 0);
      const totalAlcoholExpenses = dbAlcoholExpenses > 0 ? dbAlcoholExpenses : csvAlcoholCost;

      // Ice: Always use CSV
      const totalIceExpenses = csvIceCost;

      // Calculate derived metrics
      const totalExpenses =
        totalWages +
        totalGeneralExpenses +
        totalAlcoholExpenses +
        totalIceExpenses;

      const eventPrice = event.price || csvRevenue || 0;
      const profit = eventPrice - totalExpenses;
      const profitMargin = eventPrice ? (profit / eventPrice) * 100 : 0;

      // Per-head metrics
      const guestCount = event.guestCount || 1;
      const wagePerHead = totalWages / guestCount;
      const tipPerHead = totalTips / guestCount;
      const alcoholPerHead = totalAlcoholExpenses / guestCount;
      const generalExpensePerHead = totalGeneralExpenses / guestCount;
      const totalExpensePerHead = totalExpenses / guestCount;
      const revenuePerHead = eventPrice / guestCount;

      // Staff metrics
      const totalStaffCount = wageShifts.length;
      const averageWagePerStaff = totalStaffCount ? totalWages / totalStaffCount : 0;
      const averageTipPerStaff = totalStaffCount ? totalTips / totalStaffCount : 0;

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
        carType: carType,
        iceExpense: totalIceExpenses,
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
        priceSnapshot: eventPrice,
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
      const result = await EventActual.findOneAndUpdate(
        { event: event._id },
        updateData,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      // Check if created or updated
      if (existingActual) {
        updated++;
      } else {
        created++;
      }

      if ((created + updated) % 50 === 0) {
        console.log(`✓ Processed ${created + updated} event actuals...`);
      }
    }

    console.log(`\n✅ Seed completed!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);

    if (notFoundEvents.size > 0) {
      console.log(`\n⚠️  Events not found (${notFoundEvents.size}):`);
      const eventList = Array.from(notFoundEvents).slice(0, 20);
      console.log(`   ${eventList.join(", ")}`);
      if (notFoundEvents.size > 20) {
        console.log(`   ... and ${notFoundEvents.size - 20} more`);
      }
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding EventActuals:", error);
    process.exit(1);
  }
})();
