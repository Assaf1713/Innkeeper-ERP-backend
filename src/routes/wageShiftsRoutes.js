const express = require("express");
const router = express.Router();
const {updateWageShift,deleteWageShift,listAllWageShifts} = require("../controllers/eventWageShiftsController");
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

router.put("/:shiftId", updateWageShift);
router.delete("/:shiftId", deleteWageShift);
router.get("/", listAllWageShifts);
module.exports = router;
