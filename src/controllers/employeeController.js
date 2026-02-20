// this controller defines employee-related operations
const Employee = require("../models/Employee");
const mongoose = require("mongoose");

const sanitizeString = (value) => {
  if (typeof value !== "string") return value;
  return value.trim();
};

const formatPhone = (phone) => {
  if (!phone) return "";

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If starts with 0, replace with +972 (Israel country code)
  if (digits.startsWith("0")) {
    return `+972${digits.substring(1)}`;
  }

  // If already starts with country code
  if (digits.startsWith("972")) {
    return `+${digits}`;
  }

  // If already has +, return as is
  if (phone.startsWith("+")) {
    return phone;
  }

  // Default: assume Israel number
  return `+972${digits}`;
};

// GET /api/employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ isActive: -1, name: 1 });
    res.json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/employees/:id
exports.getEmployeeById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid employee ID" });
  }
  try {
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/employees
exports.createEmployee = async (req, res) => {
  const { name, phone, email, defaultRole } = req.body;
  const normalizedName = sanitizeString(name);
  const normalizedPhone = sanitizeString(phone);
  const normalizedEmail = sanitizeString(email)?.toLowerCase();

  if (!normalizedName) {
    return res
      .status(400)
      .json({ error: "First name and last name are required" });
  }
  try {
    const createData = {
      name: normalizedName,
      defaultRole,
    };

    if (normalizedPhone) {
      createData.phone = formatPhone(normalizedPhone);
    }

    if (normalizedEmail) {
      createData.email = normalizedEmail;
    }

    const newEmployee = await Employee.create(createData);
    res.status(201).json({ employee: newEmployee });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ error: "Email already exists" });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }

    console.error("Error creating employee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid employee ID" });
  }
  const { name, defaultRole, phone, email, isActive } = req.body;
  try {
    const updateData = {};
    const unsetData = {};

    if (name !== undefined) {
      const normalizedName = sanitizeString(name);
      if (!normalizedName) {
        return res.status(400).json({ error: "Name is required" });
      }
      updateData.name = normalizedName;
    }

    if (defaultRole !== undefined) {
      updateData.defaultRole = defaultRole;
    }

    if (phone !== undefined) {
      const normalizedPhone = sanitizeString(phone);
      if (normalizedPhone) {
        updateData.phone = formatPhone(normalizedPhone);
      } else {
        unsetData.phone = 1;
      }
    }

    if (email !== undefined) {
      const normalizedEmail = sanitizeString(email)?.toLowerCase();
      if (normalizedEmail) {
        updateData.email = normalizedEmail;
      } else {
        unsetData.email = 1;
      }
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (!Object.keys(updateData).length && !Object.keys(unsetData).length) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const updateOps = {};
    if (Object.keys(updateData).length) {
      updateOps.$set = updateData;
    }
    if (Object.keys(unsetData).length) {
      updateOps.$unset = unsetData;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      updateOps,
      { new: true, runValidators: true }
    );
    if (!updatedEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ employee: updatedEmployee });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ error: "Email already exists" });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }

    console.error("Error updating employee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid employee ID" });
  }
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(id);
    if (!deletedEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/employees/:id/wage-shifts
exports.getEmployeeWageShifts = async (req, res) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid employee ID" });
  }

  try {
    const EventWageShift = require("../models/EventWageShift");
    
    const shifts = await EventWageShift.find({ employee: id })
      .populate({
        path: "event",
        select: "eventDate eventNumber address",
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ shifts });
  } catch (error) {
    console.error("Error fetching employee wage shifts:", error);
    console.error("Error details:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// GET /api/employees/:id/planned-shifts
exports.getEmployeePlannedShifts = async (req, res) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid employee ID" });
  }

  try {
    const PlannedShift = require("../models/PlannedShift");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shifts = await PlannedShift.find({ 
      employee: id
    })
      .populate({
        path: "event",
        select: "eventDate eventNumber address",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter for future events only
    const futureShifts = shifts.filter(shift => {
      if (!shift.event || !shift.event.eventDate) return false;
      const eventDate = new Date(shift.event.eventDate);
      return eventDate >= today;
    });

    res.json({ shifts: futureShifts });
  } catch (error) {
    console.error("Error fetching employee planned shifts:", error);
    console.error("Error details:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};