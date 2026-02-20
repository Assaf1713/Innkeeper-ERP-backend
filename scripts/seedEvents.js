const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const Event = require("../src/models/Events");
const EventType = require("../src/models/EventType");
const EventStatus = require("../src/models/EventStatus");
const LeadSource = require("../src/models/LeadSource");
const MenuType = require("../src/models/MenuType");
const Customer = require("../src/models/Customers");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

// Mapping from CSV labels to lookup codes
const EVENT_TYPE_MAP = {
  "רווקות": "BACHELORETTE",
  "בר מלא חתונה": "WEDDING_FULL_BAR",
  "בר קוקטיילים לחתונה ארוכה": "WEDDING_COCKTAIL_LONG",
  "בור קוקטיילים קונספט לחתונה": "WEDDING_COCKTAIL_LONG",
  "בר קוקטיילים קונספט לחתונה": "WEDDING_COCKTAIL_LONG",
  "בר מלא אירוע פרטי": "PRIVATE_FULL_BAR",
  "אירוע חברה - מסיבה": "CORP_PARTY",
  "אירוע חברה - מינגלינג עסקי": "CORP_MINGLE",
  "אירוע חברה- האפי האוור": "CORP_HAPPY_HOUR",
  "אירוע חברה - האפי האוור": "CORP_HAPPY_HOUR",
  "אירוע קוקטיילים פרטי": "PRIVATE_COCKTAIL",
  "קבלת פנים": "RECEPTION",
  "קבלת פנים ": "RECEPTION",
  "אירוע חברה": "CORP_PARTY",
};

const STATUS_MAP = {
  "נסגר": "CLOSED",
  "לא נסגר": "NOT_CLOSED",
  "נפל": "LOST",
  "בוצע": "DONE",
  "כיוון חיובי": "POSITIVE",
  "נדחה": "POSTPONED",
};

const LEAD_SOURCE_MAP = {
  "קמפיין פייסבוק": "FACEBOOK_CAMPAIGN",
  "גוגל": "GOOGLE",
  "הפקה": "PRODUCTION",
  "המלצה": "REFERRAL",
  "מקור ראשון": "DIRECT",
  "אחר": "OTHER",
  "אינסטגרם": "INSTAGRAM",
  "אורגני": "ORGANIC",
};

const MENU_TYPE_MAP = {
  "קלאסיק": "CLASSIC",
  "פרימיום": "PREMIUM",
};

function parseNumber(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function parseTime(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  // Validate HH:mm format
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
    return trimmed;
  }
  return "";
}

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    const csvPath =
      process.argv[2] ||
      path.join(__dirname, "..", "data", "clean_events.csv");

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

    // Load all lookups into memory for faster access
    const eventTypes = await EventType.find({ isActive: true });
    const eventStatuses = await EventStatus.find({ isActive: true });
    const leadSources = await LeadSource.find({ isActive: true });
    const menuTypes = await MenuType.find({ isActive: true });

    const eventTypeMap = new Map(eventTypes.map((et) => [et.code, et._id]));
    const statusMap = new Map(eventStatuses.map((es) => [es.code, es._id]));
    const leadSourceMap = new Map(leadSources.map((ls) => [ls.code, ls._id]));
    const menuTypeMap = new Map(menuTypes.map((mt) => [mt.code, mt._id]));

    // Get default values
    const defaultEventTypeId = eventTypeMap.get("PRIVATE_COCKTAIL");
    const defaultStatusId = statusMap.get("NOT_CLOSED");
    const defaultLeadSourceId = leadSourceMap.get("GOOGLE");
    const defaultMenuTypeId = menuTypeMap.get("CLASSIC");

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of records) {
      try {
        const eventNumber = parseNumber(r["eventNumber"]);
        const customerName = String(r["customerName"] || "").trim();
        const eventDate = parseDate(r["eventDate"]);

        // Skip empty rows or invalid data
        if (!eventNumber || !customerName || !eventDate) {
          console.log(
            `Skipping row with invalid data: eventNumber=${eventNumber}, customerName=${customerName}`
          );
          skipped++;
          continue;
        }

        // Check if event already exists by eventNumber
        const existing = await Event.findOne({ eventNumber });
        if (existing) {
          console.log(`Event #${eventNumber} already exists, skipping.`);
          skipped++;
          continue;
        }

        // Map lookup values
        const eventTypeLabel = String(r["eventType"] || "").trim();
        const statusLabel = String(r["status"] || "").trim();
        const leadSourceLabel = String(r["leadSource"] || "").trim();
        const menuTypeLabel = String(r["menuType"] || "").trim();

        const eventTypeCode = EVENT_TYPE_MAP[eventTypeLabel];
        const statusCode = STATUS_MAP[statusLabel];
        const leadSourceCode = LEAD_SOURCE_MAP[leadSourceLabel];
        const menuTypeCode = MENU_TYPE_MAP[menuTypeLabel];

        const eventTypeId = eventTypeCode
          ? eventTypeMap.get(eventTypeCode)
          : defaultEventTypeId;
        const statusId = statusCode
          ? statusMap.get(statusCode)
          : defaultStatusId;
        const leadSourceId = leadSourceCode
          ? leadSourceMap.get(leadSourceCode)
          : defaultLeadSourceId;
        const menuTypeId = menuTypeCode
          ? menuTypeMap.get(menuTypeCode)
          : defaultMenuTypeId;

        // Try to find customer by name (optional)
        let customerId = null;
        if (customerName) {
          const customer = await Customer.findOne({ name: customerName });
          if (customer) {
            customerId = customer._id;
          }
        }

        // Create event
        const newEvent = new Event({
          eventNumber: Math.floor(eventNumber), // Ensure integer
          customerName,
          customer: customerId,
          eventDate,
          address: String(r["address"] || "").trim(),
          guestCount: parseNumber(r["guestCount"]),
          startTime: parseTime(r["startTime"]),
          endTime: parseTime(r["endTime"]),
          eventType: eventTypeId,
          leadSource: leadSourceId,
          menuType: menuTypeId,
          status: statusId,
          price: parseNumber(r["price"]),
          depositPaid: parseNumber(r["depositPaid"]),
          notes: String(r["notes"] || "").trim(),
        });

        await newEvent.save();
        console.log(`✓ Event #${eventNumber} - ${customerName} created.`);
        created++;
      } catch (err) {
        console.error(`Error processing event: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Seed completed!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding events:", error);
    process.exit(1);
  }
})();