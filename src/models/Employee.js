const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    defaultRole: { type: String, enum: ["manager", "bartender", "logistics"], default: "bartender" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", EmployeeSchema);
