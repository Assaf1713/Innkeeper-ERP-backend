const GeneralExpenseType = require("../models/GeneralExpenseType");

const slugify = (label) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

exports.createGeneralExpenseType = async (req, res, next) => {
  try {
    const { label, code } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ error: "label is required" });
    }

    const finalCode = (code && code.trim()) || slugify(label);

    const created = await GeneralExpenseType.create({
      code: finalCode,
      label: label.trim(),
      isActive: true,
    });

    res.status(201).json({ expenseType: created });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "code already exists" });
    }
    next(err);
  }
};

exports.listGeneralExpenseTypes = async (req, res, next) => {
  try {
    const types = await GeneralExpenseType.find().sort({ label: 1 });   
    res.json({ expenseTypes: types });
    } catch (err) {
    next(err);
    }
};


exports.deleteGeneralExpenseType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await GeneralExpenseType.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Expense type not found" });
    }
    res.json({ message: "Expense type deleted successfully" });
  } catch (err) {
    next(err);
  }
};


