const mongoose = require("mongoose");

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm

const EventWageShiftSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["manager", "bartender", "logistics"],
      required: true,
    },

    startTime: {
      type: String,
      required: true,
      match: TIME_REGEX,
    },

    endTime: {
      type: String,
      required: true,
      match: TIME_REGEX,
    },

    duration: {
      type: Number, // in minutes
    },

    wage: { type: Number, default: 0, min: 0 },
    tip: { type: Number, default: 0, min: 0 },
    paid: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// אינדקס שימושי ל-BI ולשליפות
EventWageShiftSchema.index({ event: 1, employee: 1 });

module.exports = mongoose.model("EventWageShift", EventWageShiftSchema);
