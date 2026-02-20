const mongoose = require ('mongoose');
const expensesSchema = new mongoose.Schema({
    name: { type: String, required: true },
    supplier: { type: String },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    price: { type: Number, required: true },
    notes: { type: String },
    waspaid: { type: Boolean, default: true }
},
{ timestamps: true });



module.exports = mongoose.model('Expense', expensesSchema);
