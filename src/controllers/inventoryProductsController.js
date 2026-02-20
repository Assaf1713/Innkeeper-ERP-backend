// server/src/controllers/inventoryProductsController.js
const { getAllCategories } = require("../constants/InventoryProductsCategory");
const InventoryProduct = require("../models/InventoryProduct");
const Settings = require("../models/Settings");

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

const updateNetPrice = (price) => {
  return Number((price / 1.18).toFixed(2));
}

// GET /api/lookups/inventory-products
exports.listInventoryProducts = async (req, res, next) => {
  try {
    const items = await InventoryProduct.find()
      .sort({isActive: -1, label: 1 }); // nice UX for dropdown
    for (const item of items) {
      if (item.price && !item.netPrice) {
        item.netPrice = updateNetPrice(item.price);
        await item.save();
      }
      else if (!item.price && item.netPrice) {
        item.price = Number((item.netPrice * 1.18).toFixed(2));
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
      category = "",
      menuTypeLabel = "",
      supplier = "",
      volumeMl = 0,
      price = 0,
      netPrice = 0,
    } = req.body;

    if (!label || !String(label).trim()) {
      return res.status(400).json({ error: "label is required" });
    }

    const finalCode = (code && String(code).trim()) || slugify(label);

    const created = await InventoryProduct.create({
      code: finalCode,
      label: String(label).trim(),
      category,
      menuTypeLabel,
      supplier,
      volumeMl: Number(volumeMl) || 0,
      price: price ? Number(price) || 0 : Number(netPrice * 1.18).toFixed(2),
      netPrice: netPrice? Number(netPrice) || 0 : Number(price / 1.18).toFixed(2),
      isActive: true,
    });

    return res.status(201).json({ inventoryProduct: created });
  } catch (err) {
    // Duplicate key (code unique) — your schema enforces unique code :contentReference[oaicite:5]{index=5}
    if (err?.code === 11000) {
      return res.status(409).json({ error: "code already exists" });
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
      "category",
      "menuTypeLabel",
      "supplier",
      "volumeMl",
      "price",
      "netPrice",
      "isActive",
    ];

    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }

    // normalize numeric fields
    if (patch.volumeMl !== undefined) patch.volumeMl = Number(patch.volumeMl) || 0;
    if( patch.price !== undefined && patch.netPrice !== undefined) {
      patch.price = Number(patch.price) || 0;
      patch.netPrice = Number(patch.netPrice) || 0;
    } else if (patch.price !== undefined) {
      patch.price = Number(patch.price) || 0;
      patch.netPrice = Number(patch.price / 1.18).toFixed(2);
    } else if (patch.netPrice !== undefined) {
      patch.netPrice = Number(patch.netPrice) || 0;
      patch.price = Number(patch.netPrice * 1.18).toFixed(2);
    }

    const updated = await InventoryProduct.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return res.status(404).json({ error: "Inventory product not found" });

    return res.json({ inventoryProduct: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/lookups/inventory-products/:id
exports.deleteInventoryProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await InventoryProduct.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Inventory product not found" });

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
      return res.status(400).json({ error: "newVAT is required and must be a number" });
    }
    
    // Save the new VAT rate to settings
    await Settings.findOneAndUpdate(
      { key: "currentVAT" },
      { 
        key: "currentVAT", 
        value: Number(newVAT),
        description: "Current VAT percentage used for product pricing"
      },
      { upsert: true, new: true }
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
