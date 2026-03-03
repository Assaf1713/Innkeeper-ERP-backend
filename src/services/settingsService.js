const Settings = require("../models/Settings");

exports.getSettingValue = async (key, defaultValue = null) => {
  const setting = await Settings.findOne({ key }).select("value").lean();

  if (!setting) {
    return defaultValue;
  }

  return setting.value;
};
