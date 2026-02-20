const mongoose = require("mongoose");

const EventActualSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, unique: true, index: true },
    carType: { type: String, enum: ["transporter", "mazda", "both", ""], default: "transporter" },
    iceExpense: { type: Number, default: 0, min: 0 },

    // Financial Snapshots
    totalWages: { type: Number, default: 0, min: 0 },
    totalTips: { type: Number, default: 0, min: 0 },
    totalGeneralExpenses: { type: Number, default: 0, min: 0 },
    totalAlcoholExpenses: { type: Number, default: 0, min: 0 },
    totalIceExpenses: { type: Number, default: 0, min: 0 },
    
    // Calculated totals
    totalExpenses: { type: Number, default: 0, min: 0 }, // sum of all expenses
    profit: { type: Number, default: 0 }, // price - totalExpenses
    profitMargin: { type: Number, default: 0 }, // (profit / price) * 100
    
    // Per-head metrics
    wagePerHead: { type: Number, default: 0 },
    tipPerHead: { type: Number, default: 0 },
    alcoholPerHead: { type: Number, default: 0 },
    generalExpensePerHead: { type: Number, default: 0 },
    totalExpensePerHead: { type: Number, default: 0 },
    revenuePerHead: { type: Number, default: 0 },
    
    // Event snapshots
    guestCountSnapshot: { type: Number, min: 0 },
    priceSnapshot: { type: Number, min: 0 },
    eventDateSnapshot: { type: Date },
    eventTypeSnapshot: { type: String },
    menuTypeSnapshot: { type: String },
    
    // Staff metrics
    totalStaffCount: { type: Number, default: 0 },
    averageWagePerStaff: { type: Number, default: 0 },
    averageTipPerStaff: { type: Number, default: 0 },
    
    // Operational metrics
    hoursOfOperation: { type: Number, default: 0 }, // calculated from start/end time
    wagePerHour: { type: Number, default: 0 },
    
    // Last saved timestamp
    lastSaved: { type: Date },
  },
  { timestamps: true }
);

// unique index on event field
EventActualSchema.index({ event: 1 }, { unique: true });

module.exports = mongoose.model("EventActual", EventActualSchema);