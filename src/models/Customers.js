const mongoose = require("mongoose");
const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, lowercase: true, trim: true },
    company: { type: String, trim: true },
    companyId: { type: String, trim: true },
    IsBusiness: { type: Boolean, default: false },
    phone: { type: String, trim: true },
    payingCustomer: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    }, { timestamps: true }
);
module.exports = mongoose.model("Customer", CustomerSchema);