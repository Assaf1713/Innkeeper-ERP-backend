const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  // פרטים אישיים
  fullName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  message: { type: String, default: "" }, 
  userNotes: { type: String, default: "" },
  preferences: { type: String, default: "" }, 
  
  // event data to be filled later

  eventDate: { type: Date }, 
  eventLocation: { type: String }, 
  guestCount: { type: Number }, 

  // status and source
  status: { 
    type: String, 
    enum: ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'], 
    default: 'New' 
  },
  
  
  source: { 
    type: String, 
    enum: ['landing_page_contact_form', 'landing_page_whatsapp_form', 'whatsApp_original', 'original_contact_form', 'manual', 'phone_call'],
    required: true
  },
  

  marketingData: {
    utm_source: String, 
    utm_medium: String, 
    utm_campaign: String,
    landingPage: String 
  },

relatedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
relatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null }

}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);