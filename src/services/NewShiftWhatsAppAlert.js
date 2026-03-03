// Function requires fetch (available natively in Node.js 18+) or axios
const sendShiftAssignmentWhatsApp = async (shift) => {
  try {
    // Extract variables with fallbacks to prevent empty strings which Meta rejects
    const employeeName = shift.employee?.name || "עובד/ת יקר/ה";
    
    const dateOfEvent = shift.event?.eventDate
      ? new Date(shift.event.eventDate).toLocaleDateString("he-IL")
      : "תאריך לא ידוע";
      
    const startTime = shift.startTime || "TBD";
    const endTime = shift.endTime || "TBD";
    
    const location = shift.role === "manager"
      ? "מחסן ציוד"
      : shift.event?.address || "יימסר בהמשך";
      
    // Meta API will fail if a variable is completely empty, so we provide a default text
    const notes = shift.notes && shift.notes.trim() !== "" 
      ? shift.notes 
      : "אין הערות מיוחדות";

    // Format phone number to standard international format (e.g., 972545436888)
    let rawPhone = shift.employee?.phone;
    if (!rawPhone) {
      console.error("Cannot send WhatsApp: No phone number provided for employee");
      return;
    }
    
    // Remove leading zero and add Israel country code
    const formattedPhone = rawPhone.startsWith("0") 
      ? `972${rawPhone.substring(1)}` 
      : rawPhone;

    // Credentials from environment variables
    const ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
    
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    // Construct the payload matching the Meta template exact structure
    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "shift_assignment_v2", 
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: employeeName }, // {{1}}
              { type: "text", text: dateOfEvent },  // {{2}}
              { type: "text", text: startTime },    // {{3}}
              { type: "text", text: endTime },      // {{4}}
              { type: "text", text: location },     // {{5}}
              { type: "text", text: notes }         // {{6}}
            ]
          }
        ]
      }
    };

    // Send the request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
    }

    console.log(`Successfully sent shift assignment to ${employeeName} via WhatsApp.`);
    
  } catch (error) {
    console.error("Failed to send shift assignment WhatsApp:", error.message);
  }
};

module.exports = { sendShiftAssignmentWhatsApp };