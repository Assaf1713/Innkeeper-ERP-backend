const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const EventWageShift = require("../src/models/EventWageShift");
const Employee = require("../src/models/Employee");
const Event = require("../src/models/Events");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

// Default times since CSV doesn't have them
const DEFAULT_START_TIME = "18:00";
const DEFAULT_END_TIME = "23:00";

// Map CSV employee names to actual DB employee names
const EMPLOYEE_NAME_MAPPING = {
  "ליאם": "ליעם זוהר",
  "שחף": "שחף שלום",
  "נועם": "נועם הדר",
  "עמית": "עובד מזדמן",
  "דיויד": "עובד מזדמן",
  "רועי ": "רועי ביטון",
  "רועי": "רועי ביטון",
  "אמיר": "עובד מזדמן",
  "שירן": "שירן ארול",
  "בן יוסף": "בן יוסף",
  "אלון": "אלון זוננפלד",
  "מור": "עובד מזדמן",
  "דוד וידרויץ'": "דוד וידרויץ",
  "אייזיק": "עובד מזדמן",
  "יובל": "עובד מזדמן",
  "פלג": "עובד מזדמן",
  "אלכס": "עובד מזדמן",
  "אסף/דניאל": "אסף(בעלים)",
  "אופל": "עובד מזדמן",
  "נועם גבאי": "עובד מזדמן",
  "גור": "עובד מזדמן",
  "סטס": "עובד מזדמן",
};

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "seed_wageShifts.csv");

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

    // Cache all employees and events to avoid repeated DB queries
    const allEmployees = await Employee.find({});
    const employeeMap = new Map(
      allEmployees.map((emp) => [emp.name.trim(), emp])
    );

    // Find the "עובד מזדמן" employee
    const casualEmployee = allEmployees.find((emp) => emp.name === "עובד מזדמן");
    if (!casualEmployee) {
      throw new Error(
        'Employee "עובד מזדמן" not found in database. Please create it first.'
      );
    }

    const allEvents = await Event.find({});
    const eventMap = new Map(
      allEvents.map((evt) => [evt.eventNumber, evt])
    );

    let created = 0;
    let notFoundEvents = new Set();
    let notFoundEmployees = new Set();

    for (const r of records) {
      const eventNumber = parseInt(r["מספר אירוע"]);
      const employeeName = String(r["עובד"] || "").trim();
      const wage = parseFloat(r["שכר"] || 0);
      const tip = parseFloat(r["טיפ"] || 0);
      const paidStr = String(r["שולם כן/לא"] || "").trim();
      const csvNotes = String(r["הערות"] || "").trim();

      // Skip empty rows
      if (!eventNumber || !employeeName) {
        continue;
      }

      // Find the event
      const event = eventMap.get(eventNumber);
      if (!event) {
        notFoundEvents.add(eventNumber);
        continue;
      }

      // Find the employee or use casual worker
      let originalEmployeeName = employeeName;
      let mappedEmployeeName = EMPLOYEE_NAME_MAPPING[employeeName] || employeeName;
      
      let employee = employeeMap.get(mappedEmployeeName);
      let notes = csvNotes;

      if (!employee) {
        // Employee not found even after mapping, use casual worker and add original name to notes
        notFoundEmployees.add(employeeName);
        employee = casualEmployee;
        
        // Append original employee name to notes without overriding existing notes
        if (csvNotes) {
          notes = `${csvNotes} | עובד מקורי: ${originalEmployeeName}`;
        } else {
          notes = `עובד מקורי: ${originalEmployeeName}`;
        }
      } else if (mappedEmployeeName !== originalEmployeeName && mappedEmployeeName === "עובד מזדמן") {
        // If we mapped to casual worker, add the original name to notes
        if (csvNotes) {
          notes = `${csvNotes} | עובד מקורי: ${originalEmployeeName}`;
        } else {
          notes = `עובד מקורי: ${originalEmployeeName}`;
        }
      }

      // Parse paid status
      const paid = paidStr === "כן" || paidStr === "yes";

      // Determine role based on wage (this is a simple heuristic)
      // Higher wage typically indicates manager role
      let role = "bartender"; // default
      if (wage >= 900) {
        role = "manager";
      } else if (wage <= 300) {
        role = "logistics";
      }

      // Create new EventWageShift (no duplicate check - CSV is reliable)
      const newWageShift = new EventWageShift({
        event: event._id,
        employee: employee._id,
        role: role,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        wage: wage || 0,
        tip: tip || 0,
        paid: paid,
        notes: notes,
      });

      await newWageShift.save();
      created++;

      if (created % 50 === 0) {
        console.log(`✓ Processed ${created} wage shifts...`);
      }
    }

    console.log(`\n✅ Seed completed!`);
    console.log(`   Created: ${created}`);

    if (notFoundEvents.size > 0) {
      console.log(`\n⚠️  Events not found (${notFoundEvents.size}):`);
      console.log(`   ${Array.from(notFoundEvents).join(", ")}`);
    }

    if (notFoundEmployees.size > 0) {
      console.log(`\n⚠️  Employees not found (${notFoundEmployees.size}):`);
      const employeeList = Array.from(notFoundEmployees).slice(0, 10);
      console.log(`   ${employeeList.join(", ")}`);
      if (notFoundEmployees.size > 10) {
        console.log(`   ... and ${notFoundEmployees.size - 10} more`);
      }
      console.log(`   These were assigned to "עובד מזדמן" with original name in notes.`);
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding EventWageShifts:", error);
    process.exit(1);
  }
})();
