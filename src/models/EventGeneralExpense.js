const mongoose = require("mongoose");

const EventGeneralExpenseSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    expenseType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeneralExpenseType",
      required: true,
      index: true,
    },

    amount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },

    // BI-friendly snapshots
    expenseTypeCodeSnapshot: { type: String },
    expenseTypeLabelSnapshot: { type: String },
  },
  { timestamps: true }
);

EventGeneralExpenseSchema.index({ event: 1, expenseType: 1 });

module.exports = mongoose.model("EventGeneralExpense", EventGeneralExpenseSchema);
