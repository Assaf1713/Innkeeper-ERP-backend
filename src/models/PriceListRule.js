const mongoose = require("mongoose");

const priceListRuleSchema = new mongoose.Schema({
  name: { type: String, required: true }, 
  // Logic
  eventTypes: [{ type: String }], // Array of event type CODES (e.g., ["COCKTAIL", "WEDDING"])
  minGuests: { type: Number, default: 0 },
  maxGuests: { type: Number, required: true }, 
  maxHours: { type: Number, default: 100 }, 
  
  // Pricing
  basePrice: { type: Number }, // Fixed price
  pricePerHead: { type: Number, default: 0 }, // If pricing is per head
  
  // Extra costs
  extraHourPrice: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("PriceListRule", priceListRuleSchema);