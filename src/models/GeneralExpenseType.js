// this schema defines types of general expenses that can be used in events
const mongoose = require("mongoose");
const GeneralExpenseTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
module.exports = mongoose.model("GeneralExpenseType", GeneralExpenseTypeSchema);
