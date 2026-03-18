const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      // נוסיף הערה שזה ישמש בעתיד לווטסאפ
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    account_name: {
      type: String,
      trim: true,
    },
    account_number: {
      type: String,
      trim: true,
    },
    account_bank_number: {
      type: String,
      trim: true,
    },
    account_branch_number: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);