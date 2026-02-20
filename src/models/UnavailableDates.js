const mongoose = require('mongoose');

const UnavailableDatesSchema = new mongoose.Schema(
    {
        blockedDate: { type: String, required: true }, // "2023-12-25"
        reason: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('UnavailableDates', UnavailableDatesSchema);