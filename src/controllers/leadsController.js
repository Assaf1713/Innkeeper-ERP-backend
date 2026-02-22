const Lead = require("../models/Lead");
const Customer = require("../models/Customers");

const normalizeIsraelPhone = (phoneInput) => {
  if (!phoneInput) return null;

  // 1. Strip everything except digits
  let cleanPhone = phoneInput.toString().replace(/\D/g, "");

  // 2. Peel off international Israeli prefixes
  if (cleanPhone.startsWith("00972")) {
    cleanPhone = cleanPhone.substring(5);
  } else if (cleanPhone.startsWith("972")) {
    cleanPhone = cleanPhone.substring(3);
  }

  // 3. Peel off the local leading zero (often accidentally kept after country code)
  if (cleanPhone.startsWith("0")) {
    cleanPhone = cleanPhone.substring(1);
  }

  // 4. Validate the core number (Israeli numbers without leading 0 are exactly 9 digits)
  // For example: 545436888
  if (cleanPhone.length === 9) {
    return "+972" + cleanPhone;
  }

  // Invalid length
  return null;
};

const checkEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const checkMalisiousContent = (text) => {
  const maliciousPatterns = [/</, />/, /script/i, /onerror/i, /onload/i];
  return maliciousPatterns.some((pattern) => pattern.test(text));
};

/**
 * ממיר תאריך מאלמנטור (למשל: "ינואר 26, 2026") לאובייקט Date של JS
 */


exports.ListLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLead = async (req, res) => {
  try {
    const leadData = req.body;

    // Security check for malicious content
    for (const key in leadData) {
      if (typeof leadData[key] === "string" && checkMalisiousContent(leadData[key])) {
        console.error(`❌ Malicious content detected in field ${key}: ${leadData[key]}`);
        return res.status(400).json({ error: "Malicious content detected" });
      }
    }

    // Phone normalization if provided
    if (leadData.phone) {
      const normalizedPhone = normalizeIsraelPhone(leadData.phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
      leadData.phone = normalizedPhone;
    }

    // Email validation if provided
    if (leadData.email && !checkEmailFormat(leadData.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check for existing customer by email to link
    let relatedCustomerId = null;
    if (leadData.email) {
      const existingCustomer = await Customer.findOne({ 
        email: leadData.email.toLowerCase().trim() 
      });
      if (existingCustomer) {
        relatedCustomerId = existingCustomer._id;
      }
    }

    // Create the new lead
    const newLead = new Lead({
      fullName: leadData.fullName || "Unknown",
      email: leadData.email,
      phone: leadData.phone,
      userNotes: leadData.userNotes,
      preferences: leadData.preferences,
      eventDate: leadData.eventDate,
      eventLocation: leadData.eventLocation,
      guestCount: leadData.guestCount,
      source: leadData.source || "manual",
      relatedCustomerId: relatedCustomerId,
    });

    await newLead.save();
    console.log(`✅ Lead created manually: ${newLead.fullName}, Phone: ${newLead.phone}`);
    
    res.status(201).json(newLead);
  } catch (error) {
    console.error("❌ Error creating lead:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.createLeadFromWebhook = async (req, res) => {
  try {
    console.log("📥 Webhook hit: Processing incoming lead data...");
    // Send immediate response for fast UX (user gets redirected to WhatsApp quickly)
    res.status(200).json({ success: true, message: "Lead received successfully" });
    
    const rawData = req.body;
    console.log("🔍 Processing Lead:", JSON.stringify(rawData, null, 2));

    // Smart helper function to extract fields from both Advanced Data and Default formats
    const extractField = (englishId, oldHebrewLabel) => {
      // 1. Try Advanced Data format (using the English ID set in Elementor)
      if (rawData.fields && rawData.fields[englishId]) {
        return rawData.fields[englishId].value;
      }
      
      // 2. Fallback to the old flat format (backward compatibility)
      return (
        rawData[englishId] || 
        rawData[oldHebrewLabel] || 
        rawData[`אין תווית ${englishId}`] || 
        rawData[`אין תווית ${oldHebrewLabel}`] || 
        null
      );
    };

    // Extracting data using the IDs (and fallback labels)
    const rawPhone = extractField("phone", "phone");
    const name = extractField("name", "name");
    const email = extractField("email", "email");
    const message = extractField("message", "message");
    const preferences = extractField("preferences", "איך לחזור אליי?");
    const rawDate = extractField("event_date", "תאריך האירוע");

    // Extracting metadata (Advanced Data places this in a dedicated object)
    const form_name = rawData?.form?.name || extractField("form_name", "form_name");
    const page_url = rawData?.meta?.page_url?.value || rawData?.meta?.page_url || extractField("page_url", "קישור לעמוד");
    const userAgent = rawData?.meta?.user_agent?.value || rawData?.meta?.user_agent || extractField("user_agent", "פרטי משתמש");
    const ip = rawData?.meta?.remote_ip?.value || rawData?.meta?.remote_ip || extractField("remote_ip", "IP השולח");

    // Security check for malicious content (Updated to check the extracted string values)
    const fieldsToCheck = [rawPhone, name, email, message, preferences];
    for (const val of fieldsToCheck) {
      if (typeof val === "string" && checkMalisiousContent(val)) {
        console.error(`❌ Malicious content detected: ${val}`);
        return; // Already sent 200 response, just exit
      }
    }

    // Parse event date
    let eventDate = null;
    if (rawDate) {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        eventDate = parsedDate;
      }
    }
  
    // Phone normalization and validation
    const normalizedPhone = normalizeIsraelPhone(rawPhone);

    if (!normalizedPhone && rawPhone) {
      console.error(`❌ Invalid phone number received: ${rawPhone}`);
      return;
    }

    // Source determination
    let source = "original_contact_form"; // default for unknown sources
    const pageUrl = (page_url || "").toLowerCase();
    const isFromLandingPage = pageUrl.includes("landing");
    
    if (form_name && form_name.includes("WhatsApp")) {
      source = isFromLandingPage ? "landing_page_whatsapp_form" : "whatsApp_original";
    } else if (form_name && form_name.includes("contact_form")) {
      source = isFromLandingPage ? "landing_page_contact_form" : "original_contact_form";
    }

    // Check for existing customer by email to link
    let relatedCustomerId = null;
    if (email) {
      const existingCustomer = await Customer.findOne({ email: email.toLowerCase().trim() });
      if (existingCustomer) {
          relatedCustomerId = existingCustomer._id;
      }
    }

    // Creating the new lead
    const newLead = new Lead({
      fullName: name || "Unknown",
      email: email,
      phone: normalizedPhone,
      message: message,
      preferences: preferences,
      eventDate: eventDate,
      source: source,
      relatedCustomerId: relatedCustomerId,
      marketingData: {
        landingPage: page_url,
        userAgent: userAgent,
        ip: ip,
      },
    });

    await newLead.save();
    console.log(`✅ Lead saved: ${newLead.fullName}, Phone: ${newLead.phone}`);
  } catch (error) {
    console.error("❌ System Error saving lead:", error.message);
  }
};

exports.updateLeadData = async (req, res) => {
  try {
    const leadId = req.params.id;
    const updateData = req.body;
    if (updateData.phone) {
      const normalizedPhone = normalizeIsraelPhone(updateData.phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
      updateData.phone = normalizedPhone;
    }
    if (updateData.email && !checkEmailFormat(updateData.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const updatedLead = await Lead.findByIdAndUpdate(leadId, updateData, {
      new: true,
    });
    if (!updatedLead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(200).json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const deletedLead = await Lead.findByIdAndDelete(leadId);
    if (!deletedLead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};