const mongoose = require("mongoose");

const PlannedShiftSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    role: { type: String, enum: ["manager", "bartender", "logistics"], required: true },

    startTime: { type: String, required: false }, // "18:00"
    endTime: { type: String, required: false },   // "01:00"
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Index to optimize queries by event
// אינדקסים שימושיים
PlannedShiftSchema.index({ event: 1, startTime: 1 });
PlannedShiftSchema.index({ employee: 1, startTime: 1 });

module.exports = mongoose.model("PlannedShift", PlannedShiftSchema);
