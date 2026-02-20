const express = require("express");
const router = express.Router();
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");
router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

const {createGeneralExpenseType} = require("../controllers/generalExpensesTypeController");
router.post("/general-expense-types", createGeneralExpenseType);
// list general expense types
const {listGeneralExpenseTypes} = require("../controllers/generalExpensesTypeController");
router.get("/general-expense-types", listGeneralExpenseTypes);
// delete general expense type by id
const {deleteGeneralExpenseType} = require("../controllers/generalExpensesTypeController");
router.delete("/general-expense-types/:id", deleteGeneralExpenseType);



module.exports = router;
