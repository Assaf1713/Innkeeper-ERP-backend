const mongoose = require("mongoose");

const AlcoholExpenseSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryProduct", required: true, index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPerGuest: { type: Number, required: true, min: 0 },
    productPriceSnapshot: { type: Number, required: true, min: 0 }, // in case product gets deleted or price changes, we keep a snapshot of the price at the time of the event
    productLabelSnapshot: { type: String, required: true }, // in case product gets deleted or label changes, we keep a snapshot of the label at the time of the event
    productVolumeMlSnapshot: { type: Number, required: true, min: 0 }, // in case product gets deleted or volume changes, we keep a snapshot of the volume at the time of the event

   // number of bottles used — this is the main input from the user, and from which we calculate totalAmount and amountPerGuest (but we also allow overriding those for flexibility)
    bottlesUsed: { type: Number, required: true, min: 0 },

   
    eventNumber: { type: Number, index: true }, 
  },
  { timestamps: true }
);

// למנוע כפילויות: אותו מוצר באותו אירוע = שורה אחת
AlcoholExpenseSchema.index({ event: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("AlcoholExpense", AlcoholExpenseSchema);
