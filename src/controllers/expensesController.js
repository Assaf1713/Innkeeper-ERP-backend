const Expense = require("../models/Expenses");
const { getAllCategories } = require("../constants/expenseCategories");


const AddMonthlyRentExpense = async () => {
    // Check if a rent expense for the current month already exists
  const existingRentExpense = await Expense.findOne({category: "שכירות", date: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    }});
    if (existingRentExpense) {
        return;
    }       
    const rentExpense = new Expense({
        name: "שכירות חודשית",
        supplier: "אלי",
        category: "שכירות",
        date: new Date(),
        price: 6000,
        notes: `שכירות מחסן חודש: ${new Date().toLocaleString('default', { month: 'long' })}`,
        waspaid: false,
    }); 
    await rentExpense.save();
    console.log("Monthly rent expense added.");
}

const AddMonthlyAccountingExpense = async () => {
    // Check if an accounting expense for the current month already exists
    const existingAccountingExpense = await Expense.findOne({
        category: "מנהלי", 
        name: "ראיית חשבון",
        date: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
    });
    if (existingAccountingExpense) {
        return;
    }
    const accountingExpense = new Expense({
        name: "ראיית חשבון",
        supplier: "עידו עמרם",
        category: "מנהלי",
        date: new Date(),
        price: 472,
        notes: `ראיית חשבון חודש: ${new Date().toLocaleString('default', { month: 'long' })}`,
        waspaid: false,
    });
    await accountingExpense.save();
    console.log("Monthly accounting expense added.");
}



// GET /api/expenses - Get all expenses
exports.getExpenses = async (req, res, next) => {
  try {
    await AddMonthlyRentExpense();
    await AddMonthlyAccountingExpense();
    const expenses = await Expense.find().sort({ date: -1 });
    return res.json({ expenses });
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses - Create new expense
exports.createExpense = async (req, res, next) => {
  try {
    const { name, supplier, category, date, price, notes, waspaid } = req.body;

    if (!name || !category || !date || price === undefined) {
      return res.status(400).json({
        error: "שדות חובה חסרים: שם, קטגוריה, תאריך ומחיר"
      });
    }

    const expense = new Expense({
      name,
      supplier,
      category,
      date: new Date(date),
      price: Number(price),
      notes,
      waspaid: waspaid !== undefined ? waspaid : true
    });

    await expense.save();
    return res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
};

// PUT /api/expenses/:id - Update expense
exports.updateExpense = async (req, res, next) => {
  try {
    const { name, supplier, category, date, price, notes, waspaid } = req.body;
    
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (supplier !== undefined) updateFields.supplier = supplier;
    if (category !== undefined) updateFields.category = category;
    if (date !== undefined) updateFields.date = new Date(date);
    if (price !== undefined) updateFields.price = Number(price);
    if (notes !== undefined) updateFields.notes = notes;
    if (waspaid !== undefined) updateFields.waspaid = waspaid;

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({ error: "הוצאה לא נמצאה" });
    }

    return res.json({ expense });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/expenses/:id - Delete expense
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ error: "הוצאה לא נמצאה" });
    }

    return res.json({ message: "הוצאה נמחקה בהצלחה", expense });
  } catch (err) {
    next(err);
  }
};

// GET /api/expenses/categories - Get all categories
exports.getCategories = (req, res) => {
  const categories = getAllCategories();
  return res.json({ categories });
};
