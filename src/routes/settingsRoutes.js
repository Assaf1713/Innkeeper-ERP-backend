const express = require("express");
const router = express.Router();
const { verifyToken, requireRoles } = require("../middlewares/authMiddleware");
const {
  getAllSettings,
  getSettingByKey,
  createOrUpdateSetting,
  updateSetting,
  deleteSetting,
  getSettingsAsKeyValue,
} = require("../controllers/settingsController");

router.use(verifyToken, requireRoles("SUPER_ADMIN", "ADMIN"));

// GET /api/settings
router.get("/", getAllSettings);

//GET /api/settings/key-value
router.get("/key-value", getSettingsAsKeyValue);

// GET /api/settings/:key
router.get("/:key", getSettingByKey);

// POST /api/settings
router.post("/", createOrUpdateSetting);

// PUT /api/settings/:key
router.put("/:key", updateSetting);

// DELETE /api/settings/:key
router.delete("/:key", deleteSetting);

module.exports = router;
