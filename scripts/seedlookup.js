require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const EventType = require('../src/models/EventType');
const EventStatus = require('../src/models/EventStatus');
const LeadSource = require('../src/models/LeadSource');
const MenuType = require('../src/models/MenuType');

async function resetLookups() {
  await connectDB(process.env.MONGO_URI);

  console.log('🧹 Clearing existing lookup collections...');
  await Promise.all([
    EventType.deleteMany({}),
    EventStatus.deleteMany({}),
    LeadSource.deleteMany({}),
    MenuType.deleteMany({})
  ]);

  console.log('⬆️ Inserting EventTypes...');
  await EventType.insertMany([
    { code: 'BACHELORETTE',          label: 'רווקות' },
    { code: 'WEDDING_FULL_BAR',      label: 'בר מלא חתונה' },
    { code: 'WEDDING_COCKTAIL_LONG', label: 'בר קוקטיילים לחתונה ארוכה' },
    { code: 'PRIVATE_FULL_BAR',      label: 'בר מלא אירוע פרטי' },
    { code: 'CORP_PARTY',            label: 'אירוע חברה - מסיבה' },
    { code: 'CORP_MINGLE',           label: 'אירוע חברה - מינגלינג עסקי' },
    { code: 'CORP_HAPPY_HOUR',       label: 'אירוע חברה - האפי האוור' },
    { code: 'PRIVATE_COCKTAIL',      label: 'אירוע קוקטיילים פרטי' },
    { code: 'RECEPTION',             label: 'קבלת פנים' }
  ]);

  console.log('⬆️ Inserting EventStatuses...');
  await EventStatus.insertMany([
    { code: 'CLOSED',        label: 'נסגר' },
    { code: 'NOT_CLOSED',    label: 'לא נסגר' },
    { code: 'LOST',          label: 'נפל' },
    { code: 'DONE',          label: 'בוצע' },
    { code: 'POSITIVE',      label: 'כיוון חיובי' },
    { code: 'POSTPONED',     label: 'נדחה' }
  ]);

  console.log('⬆️ Inserting LeadSources...');
  await LeadSource.insertMany([
    { code: 'FACEBOOK_CAMPAIGN', label: 'קמפיין פייסבוק' },
    { code: 'GOOGLE',            label: 'גוגל' },
    { code: 'PRODUCTION',        label: 'הפקה' },
    { code: 'REFERRAL',          label: 'המלצה' },
    { code: 'DIRECT',            label: 'מקור ראשון' },
    { code: 'OTHER',             label: 'אחר' },
    { code: 'INSTAGRAM',         label: 'אינסטגרם' },
    { code: 'ORGANIC',           label: 'אורגני' }
  ]);

  console.log('⬆️ Inserting MenuTypes...');
  await MenuType.insertMany([
    { code: 'CLASSIC', label: 'קלאסיק' },
    { code: 'PREMIUM', label: 'פרימיום' }
  ]);

  console.log('✅ Lookup tables reset completed successfully');
  await mongoose.connection.close();
}

resetLookups().catch(err => {
  console.error('❌ Error while resetting lookups:', err);
  process.exit(1);
});
