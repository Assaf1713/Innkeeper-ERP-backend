const mongoose = require("mongoose");
const Settings = require("../models/Settings");
const {getSettingValue} = require("../services/settingsService");
const DEFAULT_VAT_MULTIPLIER = 1.18; // Default VAT multiplier (e.g., 18% VAT)

const round2 = (value) => Number(Number(value || 0).toFixed(2));
const asNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const deriveNormalizedPriceFields = ({ price, netPrice }) => {
  const parsedPrice = asNullableNumber(price);
  const parsedNetPrice = asNullableNumber(netPrice);

  if (Number.isNaN(parsedPrice) || Number.isNaN(parsedNetPrice)) {
    return { error: "price and netPrice must be numbers" };
  }

  if ((parsedPrice ?? 0) < 0 || (parsedNetPrice ?? 0) < 0) {
    return { error: "price and netPrice must be non-negative" };
  }

  if (parsedPrice !== null && parsedNetPrice !== null) {
    const expectedPrice = round2(parsedNetPrice * DEFAULT_VAT_MULTIPLIER);
    if (Math.abs(expectedPrice - round2(parsedPrice)) > 0.01) {
      return { error: "price must equal netPrice multiplied by VAT" };
    }
    return { netPrice: round2(parsedNetPrice), price: expectedPrice };
  }

  if (parsedNetPrice !== null) {
    return {
      netPrice: round2(parsedNetPrice),
      price: round2(parsedNetPrice * DEFAULT_VAT_MULTIPLIER),
    };
  }

  if (parsedPrice !== null) {
    const derivedNetPrice = round2(parsedPrice / DEFAULT_VAT_MULTIPLIER);
    return {
      netPrice: derivedNetPrice,
      price: round2(derivedNetPrice * DEFAULT_VAT_MULTIPLIER),
    };
  }

  return { netPrice: 0, price: 0 };
};

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
    volumeMl: { type: Number, default: 0, min: 0 }, // VOLUME
    price: { type: Number, default: 0, min: 0 }, // PRICE
    netPrice: { type: Number, default: 0, min: 0 }, // NET PRICE 
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    defaultForWork: { type: Boolean, default: false }, 
  },
  { timestamps: true },
);

// Keep a permanent invariant: price is always derived from netPrice.
InventoryProductSchema.pre("validate", function setVatDerivedPrices(next) {
  const derived = deriveNormalizedPriceFields({
    price: this.price,
    netPrice: this.netPrice,
  });

  if (derived.error) {
    this.invalidate("netPrice", derived.error);
    return next();
  }

  this.netPrice = derived.netPrice;
  this.price = derived.price;
  return next();
});

InventoryProductSchema.pre("findOneAndUpdate", function setVatDerivedPriceOnUpdate(next) {
  const update = this.getUpdate() || {};
  const target = update.$set || update;
  const hasPrice = Object.prototype.hasOwnProperty.call(target, "price");
  const hasNetPrice = Object.prototype.hasOwnProperty.call(target, "netPrice");

  if (!hasPrice && !hasNetPrice) return next();

  const derived = deriveNormalizedPriceFields({
    price: target.price,
    netPrice: target.netPrice,
  });

  if (derived.error) {
    const err = new Error(derived.error);
    err.name = "ValidationError";
    return next(err);
  }

  target.price = derived.price;
  target.netPrice = derived.netPrice;

  if (update.$set) {
    update.$set = target;
  }

  this.setUpdate(update);
  return next();
});

module.exports = mongoose.model("InventoryProduct", InventoryProductSchema);
