// server/src/controllers/inventoryProductsController.js
const { getAllCategories } = require("../constants/InventoryProductsCategory");
const InventoryProduct = require("../models/InventoryProduct");
const Settings = require("../models/Settings");
const Suppliers = require("../models/Supplier");
const {getSettingValue} = require("../services/settingsService");

const getVATMultiplier = async () => {
  const vat = await getSettingValue("currentVAT", 18);
  return 1 + (Number(vat) || 18) / 100;
};

const INVENTORY_ERROR_CODES = {
  LABEL_REQUIRED: "INVENTORY_LABEL_REQUIRED",
  SUPPLIER_NOT_FOUND: "INVENTORY_SUPPLIER_NOT_FOUND",
  INVALID_PRICE: "INVENTORY_INVALID_PRICE",
  PRICE_MISMATCH: "INVENTORY_PRICE_MISMATCH",
  VAT_INVALID: "INVENTORY_VAT_INVALID",
  DUPLICATE_CODE: "INVENTORY_DUPLICATE_CODE",
  NOT_FOUND: "INVENTORY_NOT_FOUND",
  VALIDATION_FAILED: "INVENTORY_VALIDATION_FAILED",
};

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const asNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const errorResponse = (res, status, code, message, details) =>
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });

/**
 * Small helper to generate a stable code when the user didn't provide one.
 * // Keep it BI friendly: stable, uppercase-ish, no spaces.
 */
const slugify = (text) =>
  String(text || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\u0590-\u05FF]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

const updateNetPrice = (price, vatMultiplier) => {
  return round2(Number(price) / vatMultiplier);
};

const derivePriceFields = ({ price, netPrice }, vatMultiplier) => {
  const parsedPrice = asNullableNumber(price);
  const parsedNetPrice = asNullableNumber(netPrice);

  if (Number.isNaN(parsedPrice) || Number.isNaN(parsedNetPrice)) {
    return { error: "invalid_number" };
  }
  if ((parsedPrice ?? 0) < 0 || (parsedNetPrice ?? 0) < 0) {
    return { error: "negative_number" };
  }

  if (parsedPrice !== null && parsedNetPrice !== null) {
    const expectedPrice = round2(parsedNetPrice * vatMultiplier);
    if (Math.abs(expectedPrice - round2(parsedPrice)) > 0.01) {
      return { error: "mismatch" };
    }
    return { price: expectedPrice, netPrice: round2(parsedNetPrice) };
  }

  if (parsedNetPrice !== null) {
    return {
      netPrice: round2(parsedNetPrice),
      price: round2(parsedNetPrice * vatMultiplier),
    };
  }

  if (parsedPrice !== null) {
    const derivedNetPrice = round2(parsedPrice / vatMultiplier);
    return {
      netPrice: derivedNetPrice,
      price: round2(derivedNetPrice * vatMultiplier),
    };
  }

  return { netPrice: 0, price: 0 };
};

// GET /api/lookups/inventory-products
exports.listInventoryProducts = async (req, res, next) => {
  try {
    const vatMultiplier = await getVATMultiplier();
    const items = await InventoryProduct.find()
      .populate("supplier", "name")
      .sort({ isActive: -1, label: 1 }); // nice UX for dropdown
    for (const item of items) {
      if (item.price && !item.netPrice) {
        item.netPrice = updateNetPrice(item.price, vatMultiplier);
        await item.save();
      } else if (!item.price && item.netPrice) {
        item.price = round2(item.netPrice * vatMultiplier);
        await item.save();
      }
    }
    return res.json({ inventoryProducts: items });
  } catch (err) {
    next(err);
  }
};

// POST /api/lookups/inventory-products
exports.createInventoryProduct = async (req, res, next) => {
  try {
    const {
      code,
      label,
      superCategory = "ALCOHOL",
      category = "",
      menuTypeLabel = "",
      supplier = null,
      volumeMl = 0,
      price = null,
      netPrice = null,
      notes = "",
    } = req.body;

    if (!label || !String(label).trim()) {
      return errorResponse(
        res,
        400,
        INVENTORY_ERROR_CODES.LABEL_REQUIRED,
        "שם המוצר הוא שדה חובה",
      );
    }
    const finalCode = (code && String(code).trim()) || slugify(label);
    if (supplier) {
      const supplierExists = await Suppliers.findById(supplier);
      if (!supplierExists) {
        return errorResponse(
          res,
          400,
          INVENTORY_ERROR_CODES.SUPPLIER_NOT_FOUND,
          "Supplier not found",
        );
      }
    }
    const vatMultiplier = await getVATMultiplier();
    const derived = derivePriceFields({ price, netPrice }, vatMultiplier);
    if (derived.error === "invalid_number" || derived.error === "negative_number") {
      return errorResponse(
        res,
        422,
        INVENTORY_ERROR_CODES.INVALID_PRICE,
        "price and netPrice must be non-negative numbers",
      );
    }
    if (derived.error === "mismatch") {
      return errorResponse(
        res,
        422,
        INVENTORY_ERROR_CODES.PRICE_MISMATCH,
        "price must equal netPrice multiplied by VAT",
      );
    }

    const created = await InventoryProduct.create({
      code: finalCode,
      label: String(label).trim(),
      superCategory,
      category,
      menuTypeLabel,
      supplier: supplier || null,
      volumeMl: Number(volumeMl) || 0,
      price: derived.price,
      netPrice: derived.netPrice,
      notes: String(notes).trim(),
      isActive: true,
    });
    const populated = await created.populate("supplier", "name");

    return res.status(201).json({ inventoryProduct: populated });
  } catch (err) {
    if (err?.code === 11000) {
      return errorResponse(
        res,
        409,
        INVENTORY_ERROR_CODES.DUPLICATE_CODE,
        "שם המוצר כבר קיים. אנא בחר שם אחר",
      );
    }
    if (err?.name === "ValidationError") {
      return errorResponse(
        res,
        422,
        INVENTORY_ERROR_CODES.VALIDATION_FAILED,
        "Inventory product validation failed",
        Object.values(err.errors || {}).map((e) => e.message),
      );
    }
    next(err);
  }
};

// PUT /api/lookups/inventory-products/:id
exports.updateInventoryProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const allowed = [
      "label",
      "superCategory",
      "category",
      "menuTypeLabel",
      "supplier",
      "volumeMl",
      "price",
      "netPrice",
      "notes",
      "isActive",
      "defaultForWork",
    ];

    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (patch.supplier) {
      const supplierExists = await Suppliers.findById(patch.supplier);
      if (!supplierExists) {
        return errorResponse(
          res,
          400,
          INVENTORY_ERROR_CODES.SUPPLIER_NOT_FOUND,
          "Supplier not found",
        );
      }
    }
    // normalize numeric fields
    if (patch.volumeMl !== undefined)
      patch.volumeMl = Number(patch.volumeMl) || 0;

    if (patch.price !== undefined || patch.netPrice !== undefined) {
      const vatMultiplier = await getVATMultiplier();
      const derived = derivePriceFields({
        price: patch.price,
        netPrice: patch.netPrice,
      }, vatMultiplier);

      if (derived.error === "invalid_number" || derived.error === "negative_number") {
        return errorResponse(
          res,
          422,
          INVENTORY_ERROR_CODES.INVALID_PRICE,
          "price and netPrice must be non-negative numbers",
        );
      }
      if (derived.error === "mismatch") {
        return errorResponse(
          res,
          422,
          INVENTORY_ERROR_CODES.PRICE_MISMATCH,
          "price must equal netPrice multiplied by VAT",
        );
      }

      patch.price = derived.price;
      patch.netPrice = derived.netPrice;
    }

    const updated = await InventoryProduct.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
      context: "query",
    }).populate("supplier", "name");
    if (!updated)
      return errorResponse(
        res,
        404,
        INVENTORY_ERROR_CODES.NOT_FOUND,
        "Inventory product not found",
      );

    return res.json({ inventoryProduct: updated });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return errorResponse(
        res,
        422,
        INVENTORY_ERROR_CODES.VALIDATION_FAILED,
        "Inventory product validation failed",
        Object.values(err.errors || {}).map((e) => e.message),
      );
    }
    next(err);
  }
};

// DELETE /api/lookups/inventory-products/:id
exports.deleteInventoryProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await InventoryProduct.findByIdAndDelete(id);
    if (!deleted)
      return errorResponse(
        res,
        404,
        INVENTORY_ERROR_CODES.NOT_FOUND,
        "Inventory product not found",
      );

    return res.json({ message: "Inventory product deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = getAllCategories();
    return res.json({ categories: categories });
  } catch (err) {
    next(err);
  }
};

exports.ChangeVATbulkEdit = async (req, res, next) => {
  try {
    const { newVAT } = req.body;
    if (newVAT === undefined || isNaN(Number(newVAT))) {
      return errorResponse(
        res,
        400,
        INVENTORY_ERROR_CODES.VAT_INVALID,
        "newVAT is required and must be a number",
      );
    }

    // Save the new VAT rate to settings
    await Settings.findOneAndUpdate(
      { key: "currentVAT" },
      {
        key: "currentVAT",
        value: Number(newVAT),
        description: "Current VAT percentage used for product pricing",
      },
      { upsert: true, new: true },
    );

    const vatRate = Number(newVAT) / 100;

    const products = await InventoryProduct.find();
    for (const product of products) {
      if (product.netPrice) {
        product.price = Number((product.netPrice * (1 + vatRate)).toFixed(2));
        await product.save();
      } else if (product.price) {
        product.netPrice = Number((product.price / (1 + vatRate)).toFixed(2));
        await product.save();
      }
    }

    return res.json({ message: "VAT updated successfully for all products" });
  } catch (err) {
    next(err);
  }
};
