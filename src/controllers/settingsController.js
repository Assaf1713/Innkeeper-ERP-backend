const Settings = require("../models/Settings");

// GET /api/settings
exports.getAllSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find().sort({ key: 1 });
    
    // Return full settings array with descriptions
    return res.json({ settings });
  } catch (err) {
    next(err);
  }
};


exports.getSettingsAsKeyValue = async (req, res, next) => {
  try {
    const settings = await Settings.find();
    const keyValueSettings = {};
    
    settings.forEach(setting => {
      keyValueSettings[setting.key] = setting.value;
    });

    return res.json({ settings: keyValueSettings });
  } catch (err) {
    next(err);
  }
};

// GET /api/settings/:key
exports.getSettingByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findOne({ key });
    
    if (!setting) {
      return res.status(404).json({ error: "Setting not found" });
    }
    
    return res.json({ key: setting.key, value: setting.value });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings
exports.createOrUpdateSetting = async (req, res, next) => {
  try {
    const { key, value, description = "" } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: "key is required" });
    }
    
    if (value === undefined) {
      return res.status(400).json({ error: "value is required" });
    }
    
    const setting = await Settings.findOneAndUpdate(
      { key },
      { key, value, description },
      { new: true, upsert: true }
    );
    
    return res.json({ setting });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings/:key
exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: "value is required" });
    }
    
    const updateData = { value };
    if (description !== undefined) {
      updateData.description = description;
    }
    
    const setting = await Settings.findOneAndUpdate(
      { key },
      updateData,
      { new: true }
    );
    
    if (!setting) {
      return res.status(404).json({ error: "Setting not found" });
    }
    
    return res.json({ setting });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/settings/:key
exports.deleteSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findOneAndDelete({ key });
    
    if (!setting) {
      return res.status(404).json({ error: "Setting not found" });
    }
    
    return res.json({ message: "Setting deleted successfully" });
  } catch (err) {
    next(err);
  }
};
