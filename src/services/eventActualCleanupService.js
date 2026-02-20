const EventActual = require("../models/EventActual");
const EventStatus = require("../models/EventStatus");

/**
 * Delete EventActual if the event's status is not DONE
 * @param {String} eventId - The event ID
 * @returns {Object} Result with deletion info
 */
async function cleanupEventActualIfNotDone(eventId) {
  try {
    const eventActual = await EventActual.findOne({ event: eventId })
      .populate({
        path: "event",
        populate: { path: "status" }
      });

    if (!eventActual) {
      return { deleted: false, reason: "No EventActual found" };
    }

    if (!eventActual.event) {
      // Orphaned EventActual - delete it
      await EventActual.deleteOne({ _id: eventActual._id });
      return { deleted: true, reason: "Event not found (orphaned)" };
    }

    const doneStatus = await EventStatus.findOne({ code: "DONE" });
    
    if (!doneStatus) {
      console.warn("DONE status not found in database");
      return { deleted: false, reason: "DONE status not found" };
    }

    // Check if event status is NOT DONE
    if (eventActual.event.status._id.toString() !== doneStatus._id.toString()) {
      await EventActual.deleteOne({ _id: eventActual._id });
      return { 
        deleted: true, 
        reason: `Event status is ${eventActual.event.status.code}, not DONE`,
        eventNumber: eventActual.event.eventNumber
      };
    }

    return { deleted: false, reason: "Event status is DONE" };
    
  } catch (error) {
    console.error("Error in cleanupEventActualIfNotDone:", error);
    throw error;
  }
}

/**
 * Batch cleanup - delete all EventActuals where event status is not DONE
 * @returns {Object} Result with count of deleted documents
 */
async function cleanupAllNonDoneEventActuals() {
  try {
    const doneStatus = await EventStatus.findOne({ code: "DONE" });
    
    if (!doneStatus) {
      throw new Error("DONE status not found in database");
    }

    const allActuals = await EventActual.find()
      .populate({
        path: "event",
        populate: { path: "status" }
      })
      .lean();

    const toDelete = [];
    
    for (const actual of allActuals) {
      // Delete if event doesn't exist (orphaned)
      if (!actual.event) {
        toDelete.push(actual._id);
        continue;
      }

      // Delete if event status is not DONE
      if (actual.event.status && 
          actual.event.status._id.toString() !== doneStatus._id.toString()) {
        toDelete.push(actual._id);
      }
    }

    if (toDelete.length === 0) {
      return { deletedCount: 0, message: "No invalid EventActuals found" };
    }

    const result = await EventActual.deleteMany({ _id: { $in: toDelete } });

    return {
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} invalid EventActual(s)`
    };

  } catch (error) {
    console.error("Error in cleanupAllNonDoneEventActuals:", error);
    throw error;
  }
}

module.exports = {
  cleanupEventActualIfNotDone,
  cleanupAllNonDoneEventActuals
};
