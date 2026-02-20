const mongoose = require("mongoose");

const AlcoholExpenseSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryProduct", required: true, index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPerGuest: { type: Number, required: true, min: 0 },


    // מספר בקבוקים שנגמרו באירוע
    bottlesUsed: { type: Number, required: true, min: 0 },

    // דנורמליזציה אופציונלית לנוחות (לא חובה)
    eventNumber: { type: Number, index: true }, 
  },
  { timestamps: true }
);

// למנוע כפילויות: אותו מוצר באותו אירוע = שורה אחת
AlcoholExpenseSchema.index({ event: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("AlcoholExpense", AlcoholExpenseSchema);
