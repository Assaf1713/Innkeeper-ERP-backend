const cron = require('node-cron');
const PlannedShift = require('../models/PlannedShift');
const Event = require('../models/Events'); 
const { getSettingValue } = require('../services/settingsService');


// Helper function to send the reminder via Meta API
const sendShiftReminderWhatsApp = async (shift) => {
  try {
    // Optional: Check if the feature is enabled in settings
    const autoWhatsAppShiftReminders = await getSettingValue('autoWhatsAppNotificationThreeDaysBeforeEvent');
    if (autoWhatsAppShiftReminders === false) {
      return;
    }

    const employeeName = shift.employee?.name || "עובד/ת יקר/ה";
    const dateOfEvent = shift.event?.eventDate
      ? new Date(shift.event.eventDate).toLocaleDateString("he-IL")
      : "תאריך לא ידוע";
      
    const startTime = shift.startTime || "יינתן בהמשך";
    const location = shift.role === "manager"
      ? "מחסן (אפעל 11 פתח תקווה)"
      : shift.event?.address || "יימסר בהמשך";

    let rawPhone = shift.employee?.phone;
    if (!rawPhone) {
      console.error("Cannot send reminder: No phone number provided");
      return;
    }
    
    const formattedPhone = rawPhone.startsWith("0") 
      ? `972${rawPhone.substring(1)}` 
      : rawPhone;

    const ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
    
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    // Make sure to create and approve a new template in Meta for this reminder
    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "shift_reminder_v1", 
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: employeeName },
              { type: "text", text: dateOfEvent },
              { type: "text", text: startTime },
              { type: "text", text: location }
            ]
          }
        ]
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
    }

    console.log(`Successfully sent shift reminder to ${employeeName}`);
    
  } catch (error) {
    console.error("Failed to send shift reminder:", error.message);
  }
};

// Main function to initialize the cron job
const initShiftReminderCron = () => {
  // Schedule task to run every day at 20:00 
  cron.schedule('0 20 * * *', async () => {
    try {
      console.log('Running daily shift reminder job...');
      
      // Calculate target dates (Start and end of the day, exactly 2 days from now)
      const targetDateStart = new Date();
      targetDateStart.setDate(targetDateStart.getDate() + 2);
      targetDateStart.setHours(0, 0, 0, 0);
      
      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setHours(23, 59, 59, 999);

      // Find events happening in exactly 2 days
      const upcomingEvents = await Event.find({
        eventDate: { $gte: targetDateStart, $lte: targetDateEnd }
      });

      if (upcomingEvents.length === 0) {
        console.log('No events found for 2 days from now.');
        return;
      }

      const eventIds = upcomingEvents.map(event => event._id);

      // Find all planned shifts for these events and populate related data
      const upcomingShifts = await PlannedShift.find({
        event: { $in: eventIds }
      }).populate('employee').populate('event');

      // Send WhatsApp message to each assigned employee
      for (const shift of upcomingShifts) {
        await sendShiftReminderWhatsApp(shift);
      }
      
    } catch (error) {
      console.error('Error running shift reminder cron job:', error);
    }
  }, {
    scheduled: true,
    // Ensures the cron runs exactly at 20:00 Israel time, regardless of server location
    timezone: "Asia/Jerusalem" 
  });
};

module.exports = { initShiftReminderCron };