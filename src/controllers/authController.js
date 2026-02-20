const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 1. חיפוש המשתמש
    const user = await User.findOne({ username, isActive: true }).populate("employee", "name email");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2. בדיקת סיסמה מול ההצפנה
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. יצירת הטוקן
    const payload = {
      id: user._id,
      role: user.role,
      username: user.username,
      employeeId: user.employee ? user.employee._id : null
    };

    // הטוקן יהיה בתוקף ל-24 שעות
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      message: "Logged in successfully",
      token,
      user: payload
    });
  } catch (error) {
    next(error);
  }
};


exports.register = async (req, res, next) => {
  try {
    const { username, password, role, employeeId } = req.body;

    // הצפנת הסיסמה (salt of 10 rounds)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: role || "BASIC",
      employee: employeeId || null
    });

    res.status(201).json({ message: "User created successfully", userId: newUser._id });
  } catch (error) {
    next(error);
  }
};