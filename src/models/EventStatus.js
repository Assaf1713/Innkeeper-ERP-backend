const mongoose = require('mongoose');

const eventStatusSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  label: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('EventStatus', eventStatusSchema);
