const EventGeneralExpense = require("../models/EventGeneralExpense");
const GeneralExpenseType = require("../models/GeneralExpenseType");

// POST /api/events/:id/general-expenses
exports.createGeneralExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { expenseTypeId, amount, notes } = req.body;

    const type = await GeneralExpenseType.findById(expenseTypeId).lean();
    if (!type) return res.status(400).json({ error: "Invalid expenseTypeId" });

    // check if an expense of the same type already exists for this event
    const existing = await EventGeneralExpense.findOne({ event: id, expenseType: expenseTypeId });
    if (existing) {
      // if exists, update the amount by adding to the existing amount
      existing.amount += amount;
      if (notes) existing.notes = notes;
      await existing.save();
      return res.status(200).json({ expense: existing });
    }

    const created = await EventGeneralExpense.create({
      event: id,
      expenseType: expenseTypeId,
      amount,
      notes: notes ?? "",
      expenseTypeCodeSnapshot: type.code,
      expenseTypeLabelSnapshot: type.label,
    });

    const populated = await created.populate("expenseType", "code label");
    return res.status(201).json({ expense: populated });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id/general-expenses
exports.listGeneralExpenses = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expenses = await EventGeneralExpense.find({ event: id })
      .populate("expenseType", "code label")
      .sort({ createdAt: -1 });

    return res.json({ expenses });
  } catch (err) {
    next(err);
  }
};

