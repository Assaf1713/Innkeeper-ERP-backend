// server/src/controllers/alcoholExpensesController.js
const AlcoholExpense = require("../models/AlcoholExpense");
const InventoryProduct = require("../models/InventoryProduct");
const Event = require("../models/Events");

// GET /api/events/:id/alcohol-expenses
exports.listAlcoholExpenses = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Populate product so the UI can show label + price (your UI expects that).
    const alcoholExpenses = await AlcoholExpense.find({ event: id })
      .populate("product", "code label price netPrice isActive")
      .sort({ createdAt: -1 });

    return res.json({ alcoholExpenses });
  } catch (err) {
    next(err);
  }
};

// PUT /api/events/:id/alcohol-expenses  (UPSERT by event+product)
exports.upsertAlcoholExpense = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const {
      productId,
      expenseId,
      bottlesUsed,
      totalAmount,
      amountPerGuest,
    } = req.body;

    let resolvedProductId = productId;
    if (!resolvedProductId && expenseId) {
      const existingExpense = await AlcoholExpense.findOne({
        _id: expenseId,
        event: eventId,
      })
        .select("product")
        .lean();
      resolvedProductId = existingExpense?.product?.toString();
    }

    if (!resolvedProductId)
      return res.status(400).json({ error: "productId is required" });
    if (bottlesUsed === undefined || bottlesUsed === null) {
      return res.status(400).json({ error: "bottlesUsed is required" });
    }
    const parsedBottlesUsed = Number(bottlesUsed);
    if (!Number.isFinite(parsedBottlesUsed)) {
      return res.status(400).json({ error: "bottlesUsed must be a number" });
    }
    if (parsedBottlesUsed < 0) {
      return res.status(400).json({ error: "bottlesUsed must be >= 0" });
    }

    // Validate product exists
    const product = await InventoryProduct.findById(resolvedProductId).lean();
    if (!product) return res.status(400).json({ error: "Invalid productId" });

    // Optional: store eventNumber for convenience (your schema has eventNumber) :contentReference[oaicite:6]{index=6}
    const ev = await Event.findById(eventId)
      .select("eventNumber guestCount")
      .lean();
    if (!ev) return res.status(404).json({ error: "Event not found" });
    const guestCount = ev?.guestCount || 0;
    const productAmount = product?.volumeMl || 0;

    // Calculate totals if not provided
    let finalTotalAmount = totalAmount;
    let finalAmountPerGuest = amountPerGuest;
    
    if (finalTotalAmount === undefined || finalTotalAmount === null) {
      finalTotalAmount = parsedBottlesUsed * productAmount;
    }
    
    if (finalAmountPerGuest === undefined || finalAmountPerGuest === null) {
      finalAmountPerGuest = guestCount > 0 ? finalTotalAmount / guestCount : 0;
    }

    const finalProductPriceSnapshot = product.price || 0;
    const finalProductLabelSnapshot = product.label || "";
    const finalProductVolumeMlSnapshot = product.volumeMl || 0;

    // IMPORTANT: schema has unique index on event+product
    // So the correct behavior is to "upsert" — update if exists, else create.
    const updated = await AlcoholExpense.findOneAndUpdate(
      { event: eventId, product: resolvedProductId },
      {
        $set: {
          bottlesUsed: parsedBottlesUsed,
          eventNumber: ev.eventNumber,
          totalAmount: finalTotalAmount,
          amountPerGuest: finalAmountPerGuest,
          productPriceSnapshot: finalProductPriceSnapshot,
          productLabelSnapshot: finalProductLabelSnapshot,
          productVolumeMlSnapshot: finalProductVolumeMlSnapshot,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("product", "code label price netPrice volumeMl isActive");

    return res.json({ alcoholExpense: updated });
  } catch (err) {
    // In rare race conditions, unique index could throw duplicate key.
    // The client can retry, but usually findOneAndUpdate handles it.
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Duplicate alcohol expense row" });
    }
    next(err);
  }
};

// DELETE /api/alcohol-expenses/:id
exports.deleteAlcoholExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await AlcoholExpense.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ error: "Alcohol expense not found" });

    return res.json({ message: "Alcohol expense deleted successfully" });
  } catch (err) {
    next(err);
  }
};
