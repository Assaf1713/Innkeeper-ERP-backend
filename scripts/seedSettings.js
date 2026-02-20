const mongoose = require("mongoose");
const Settings = require("../src/models/Settings");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

const defaultSettings = [
  // --- הגדרות עסק בסיסיות ---
  {
    key: "businessName",
    value: "אינקיפר שירותי בר",
    description: "שם העסק (מופיע במסמכים)",
  },
  {
    key: "companyId",
    value: "558448569",
    description: "מספר ח.פ. / עוסק מורשה",
  },
  {
    key: "businessPhone",
    value: "054-5436888",
    description: "טלפון ליצירת קשר",
  },
  {
    key: "businessEmail",
    value: "office@innkeeperpopup.com",
    description: "כתובת אימייל ליצירת קשר",
  },
  {
    key: "currency",
    value: "ILS",
    description: "מטבע ברירת המחדל (ILS/USD)",
  },
  {
    key: "currentVAT",
    value: 18,
    description: "אחוז המעמ הנוכחי"
  },

  // --- הגדרות ברירת מחדל לאירועים ---
  {
    key: "defaultEventDuration",
    value: 3,
    description: "משך אירוע ברירת מחדל בשעות (משמש למחשבונים)",
  },

  {
    key: "allowOverlappingEvents",
    value: true,
    description: "האם לאפשר שיבוץ אירועים חופפים באותו תאריך",
  },

  // --- הגדרות פיננסיות ומקדמות ---
  {
    key: "profitMarginTarget",
    value: 50,
    description: "יעד רווח גולמי באחוזים (עבור מחשבון התמחור)",
  },

  // --- הגדרות שכר וכוח אדם (קריטי למחשבון תמחור) ---
  {
    key: "defaultBartenderWage",
    value: 60,
    description: "שכר שעתי",
  },
  {
    key: "defaultLogisticsStaffWage",
    value: 40,
    description: "שכר שעתי בסיס למלצר/עובד כללי",
  },
  {
    key: "guestsPerStaffRatio",
    value: 50,
    description: "מפתח חישוב כוח אדם: מספר אורחים לכל איש צוות",
  },
  {
    key: "defaultSetupTimePerEvent",
    value: 3,
    description: "זמן הכנה וסידור ממוצע לאירוע בשעות",
  },
    {
    key: "defaultSetupTimePerEventForManager",
    value: 7,
    description: "זמן הכנה וסידור ממוצע לאירוע בשעות",
  },

  // --- הגדרות עלויות משתנות ולוגיסטיקה ---
  {
    key: "defaultIceCostPerKg",
    value: 4,
    description: "עלות קילו קרח בשקלים",
  },
  {
    key: "defaultIceKgPerGuest",
    value: 1,
    description: "ממוצע צריכה של קילו קרח לאורח",
  },
  {
    key: "defaultLogisticsFixedCost",
    value: 500,
    description: "הוצאות לוגיסטיות קבועות לאירוע (הובלה, ציוד וכו')",
  },
  {
    key: "defaultAlcoholCostFallback",
    value: 25,
    description: "עלות אלכוהול לראש (ברירת מחדל כשאין היסטוריה סטטיסטית)",
  },
  {
    key: "defaultDrivingTimePerEvent",
    value: 1,
    description: "זמן נסיעה ברירת מחדל לאירוע",
  },
  {
    key: "drivingTimeSafetyMargin",
    value: 1800,
    description: "מרווח ביטחון לזמן הנסיעה (בשניות)",
  },
  {
    key: "fuel_price_per_km",
    value: 2.5,
    description: "מחיר דלק לקילומטר (בשקלים)"
  },  




  // --- הגדרות מלאי ---
  {
    key: "inventoryWarningThreshold",
    value: 2,
    description: "סף כמות מינימלי במלאי להפעלת התרעה",
  },

  // --- הגדרות מערכת ---
  {
    key: "fiscalYearStart",
    value: "01-01",
    description: "תאריך תחילת שנת מס (MM-DD)",
  },
  {
    key: "enableEmailNotifications",
    value: false,
    description: "הפעלת שליחת אימיילים אוטומטית (אישורי הזמנה/תזכורות)",
  },
  {
    key: "autoCalculateEventCost",
    value: true,
    description: "האם לעדכן אוטומטית עלויות אירוע בסגירה (Event Actuals)",
  },
];

(async () => {
  try {
    if (!MONGO_URI) throw new Error("Missing MONGO_URI in env");

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const settingData of defaultSettings) {
      // אנחנו בודקים לפי המפתח (Key)
      const existing = await Settings.findOne({ key: settingData.key });

      if (existing) {
        existing.description = settingData.description;
        await existing.save();
        console.log(`🔄 Updated description for: ${settingData.key}`);
        
        console.log(`⏭️  Skipping existing setting: ${settingData.key}`);
        skipped++;
      } else {
        await Settings.create(settingData);
        console.log(`✅ Created setting: ${settingData.key} = ${settingData.value}`);
        created++;
      }
    }

    console.log("\n📊 Seed Summary:");
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${created + skipped}`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Error seeding settings:", err);
    process.exit(1);
  }
})();