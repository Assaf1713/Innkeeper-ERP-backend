const mongoose = require("mongoose");

const InventoryProductSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true }, // LABEL
    superCategory: {
      type: String,
      enum: [
        "ALCOHOL",
        "SOFT_DRINKS",
        "PLASTICS",
        "RENTALS",
        "FOOD",
        "EQUIPMENT",
        "GENERAL",
      ],
      default: "ALCOHOL",
    }, // SUPER CATEGORY
    category: { type: String, default: "" }, 
    menuTypeLabel: { type: String, default: "" }, 
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" }, 
    volumeMl: { type: Number, default: 0 }, // VOLUME
    price: { type: Number, default: 0 }, // PRICE
    netPrice: { type: Number, default: 0 }, // NET PRICE 
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    defaultForWork: { type: Boolean, default: false }, 
  },
  { timestamps: true },
);

module.exports = mongoose.model("InventoryProduct", InventoryProductSchema);
