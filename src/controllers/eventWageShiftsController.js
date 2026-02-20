const mongoose = require("mongoose");
const EventWageShift = require("../models/EventWageShift");
const PlannedShift = require("../models/PlannedShift");
const Setting = require("../models/Settings");



const calculateShiftDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "-";
    let [startHour, startMinute] = startTime.split(":").map(Number);
    let [endHour, endMinute] = endTime.split(":").map(Number);
    // In case of end hour post midnight
    if (endHour < startHour) 
      endHour += 24;
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const durationMinutes = (endTotalMinutes - startTotalMinutes) / 60;
    if (durationMinutes < 0) return "-";
    return durationMinutes.toFixed(1);
};

const getDefaultBartenderWage = async () => {
  try {
    const setting = await Setting.findOne({ key: "defaultBartenderWage" });
    return setting?.value || 60; // Default fallback
  } catch (err) {
    console.error("Error fetching defaultBartenderWage:", err);
    return 60; // Default fallback
  }
};




// GET /api/wage-shifts
exports.listAllWageShifts = async (req, res, next) => {
  try {
    const shifts = await EventWageShift.find()
      .populate("employee", "name")
      .populate("event", "eventNumber eventDate address")
      .sort({ "event.eventDate": -1, startTime: 1 });

    // Sort in JavaScript after population since MongoDB can't sort by populated field directly
    const sortedShifts = shifts.sort((a, b) => {
      const dateA = a.event?.eventDate ? new Date(a.event.eventDate) : new Date(0);
      const dateB = b.event?.eventDate ? new Date(b.event.eventDate) : new Date(0);
      return dateB - dateA; // Most recent first
    });

    res.json({ shifts: sortedShifts });
  } catch (err) {
    next(err);
  }
};

 // GET /api/events/:id/wage-shifts
 
exports.listWageShifts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const shifts = await EventWageShift.find({ event: id })
      .populate("employee", "name")
      .sort({ startTime: 1 });

    res.json({ shifts });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/events/:id/wage-shifts
 */
exports.createWageShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { employeeId, role, startTime, endTime, wage, tip, paid , notes } = req.body;

    const duration = calculateShiftDuration(startTime, endTime) || 0;
    const defaultWage = await getDefaultBartenderWage();
    const calculatedWage = wage !== undefined ? wage : (parseFloat(duration) * defaultWage);

    const created = await EventWageShift.create({
      event: id,
      employee: employeeId,
      role,
      startTime,
      endTime,
      duration,
      wage: calculatedWage ,
      tip: tip ?? 0,
      paid: paid ?? false,
      notes: notes ?? "",
    });

    const populated = await created.populate("employee", "name");
    res.status(201).json({ shift: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/wage-shifts/:shiftId
 */
exports.updateWageShift = async (req, res, next) => {
  try {
    const { shiftId } = req.params;
    const { employeeId, ...restBody } = req.body;

    // Fetch existing shift to get current values
    const existingShift = await EventWageShift.findById(shiftId);
    if (!existingShift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    // Use existing values as defaults for time calculations
    const startTime = restBody.startTime || existingShift.startTime;
    const endTime = restBody.endTime || existingShift.endTime;
    const duration = calculateShiftDuration(startTime, endTime) || 0;
    
    const updateData = { ...restBody, duration };

    if (employeeId !== undefined) {
      updateData.employee = employeeId;
    }

    // If wage is not explicitly provided and time changed, recalculate wage
    const timeChanged = (restBody.startTime !== existingShift.startTime || restBody.endTime !== existingShift.endTime) && !restBody.wage;
    if (timeChanged) {
      const defaultWage = await getDefaultBartenderWage();
      updateData.wage = parseFloat(duration) * defaultWage;
    }

    const updated = await EventWageShift.findByIdAndUpdate(
      shiftId,
      updateData,
      { new: true, runValidators: true }
    ).populate("employee", "name");

    res.json({ shift: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/wage-shifts/:shiftId
 */
exports.deleteWageShift = async (req, res, next) => {
  try {
    const { shiftId } = req.params;

    const deleted = await EventWageShift.findByIdAndDelete(shiftId);
    if (!deleted) {
      return res.status(404).json({ error: "Shift not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/events/:id/wage-shifts/import-planned
 * Promote PlannedShifts → WageShifts
 */

exports.importPlannedShifts = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("Importing planned shifts for event:", id);
    const planned = await PlannedShift.find({ event: id });

    if (planned.length === 0) {
      return res.json({ imported: 0, shifts: [] });
    }

    const defaultWage = await getDefaultBartenderWage();

    const docs = planned.map((p) => {
      const duration = calculateShiftDuration(p.startTime, p.endTime) || 0;
      return {
        event: id,
        employee: p.employee,
        role: p.role,
        startTime: p.startTime, // STRING HH:mm
        endTime: p.endTime,
        duration,
        wage: parseFloat(duration) * defaultWage,
        tip: 0,
        notes: p.notes ?? "",
      };
    });

    const created = await EventWageShift.insertMany(docs);
    const populated = await EventWageShift.find({
      _id: { $in: created.map((x) => x._id) },
    }).populate("employee", "name");

    res.status(201).json({
      imported: populated.length,
      shifts: populated,
    });
  } catch (err) {
    next(err);
  }
};

exports.markAllShiftsAsPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await require("../models/Events").findById(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    const result = await EventWageShift.updateMany(
      { event: id },
      { $set: { paid: true } }
    );
    res.json({ modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
};
