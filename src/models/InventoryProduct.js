const mongoose = require("mongoose");

const InventoryProductSchema = new mongoose.Schema(
  {
    
    code: { type: String, required: true, unique: true, index: true },

    label: { type: String, required: true },      // LABEL
    category: { type: String, default: "" },      // CATEGORY
    menuTypeLabel: { type: String, default: "" }, // MENU TYPE (בשלב ראשון כשם)
    supplier: { type: String, default: "123" },      // SUPPLIER
    volumeMl: { type: Number, default: 0 },       // VOLUME
    price: { type: Number, default: 0 },          // PRICE
    netPrice: { type: Number, default: 0 },       // NET PRICE (ננקה ₪)
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryProduct", InventoryProductSchema);
