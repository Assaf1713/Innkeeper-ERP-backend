const EventGeneralExpenseSchema = require("../models/EventGeneralExpense");

exports.deleteGeneralExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await EventGeneralExpenseSchema.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "General expense not found" });
    }
    res.json({ message: "General expense deleted successfully" });
  } catch (error) {
    next(error);
  }
};
