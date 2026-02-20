// plannedShiftController.js

const PlannedShift = require('../models/PlannedShift');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Event = require('../models/Events');


// GET /api/events/:eventId/planned-shifts
exports.getPlannedShiftsByEventId = async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: "Invalid eventId" });
  }

  try {
    const plannedShifts = await PlannedShift.find({ event: eventId })
      .populate("employee") // מחזיר את אובייקט העובד
      .sort({ startTime: 1 });

    return res.json({ plannedShifts });
  } catch (error) {
    console.error("Error fetching planned shifts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/events/:eventId/planned-shifts
exports.createPlannedShift = async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: "Invalid eventId" });
  }

  const { employeeId, role, startTime, endTime, notes } = req.body;

  
  if (!employeeId) return res.status(400).json({ error: "employeeId is required" });

  try {
    const created = await PlannedShift.create({
      event : eventId,
      employee : employeeId,
      role : role ?? "bartender",
      startTime : startTime ?? "TBD",
      endTime : endTime ?? "TBD",
      notes: notes ?? "",
    });

    const populated = await PlannedShift.findById(created._id).populate("employee");
    res.status(201).json({ plannedShift: populated });
  } catch (error) {
    console.error("Error creating planned shift:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// PUT /api/planned-shifts/:id
exports.updatePlannedShift = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { employeeId, role, startTime, endTime, notes } = req.body;

  
  const update = {};
  if (employeeId !== undefined) update.employee = employeeId;
  if (role !== undefined) update.role = role;
  if (notes !== undefined) update.notes = notes;
  if (startTime !== undefined) update.startTime = startTime;
if (endTime !== undefined) update.endTime = endTime;

  try {
    const existing = await PlannedShift.findById(id);
    if (!existing) return res.status(404).json({ error: "PlannedShift not found" });
    const updated = await PlannedShift.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).populate("employee");

    res.json({ plannedShift: updated });
  } catch (error) {
    console.error("Error updating planned shift:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// DELETE /api/planned-shifts/:id
exports.deletePlannedShift = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const deleted = await PlannedShift.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "PlannedShift not found" });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting planned shift:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




