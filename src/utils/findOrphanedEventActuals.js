require("dotenv").config();
const mongoose = require("mongoose");
const EventActual = require("../models/EventActual");
const Event = require("../models/Events");
const EventStatus = require("../models/EventStatus");

async function findOrphanedEventActuals() {
  try {
    // Get the "DONE" status ID
    const doneStatus = await EventStatus.findOne({ code: "DONE" });
    
    if (!doneStatus) {
      console.log("Warning: 'DONE' status not found in database");
    }

    // Get all event actuals with populated event data
    const allActuals = await EventActual.find()
      .populate({
        path: "event",
        populate: { path: "status" }
      })
      .lean();

    console.log(`\nTotal EventActuals found: ${allActuals.length}\n`);

    const orphanedActuals = [];
    const notDoneActuals = [];

    for (const actual of allActuals) {
      // Case 1: Event doesn't exist (was deleted)
      if (!actual.event) {
        orphanedActuals.push({
          _id: actual._id,
          eventId: actual.event,
          reason: "Event not found in Events collection"
        });
        continue;
      }

      // Case 2: Event exists but status is not DONE
      if (doneStatus && actual.event.status && 
          actual.event.status._id.toString() !== doneStatus._id.toString()) {
        notDoneActuals.push({
          _id: actual._id,
          eventId: actual.event._id,
          eventNumber: actual.event.eventNumber,
          eventDate: actual.event.eventDate,
          currentStatus: actual.event.status.code,
          reason: "Event status is not DONE"
        });
      }
    }

    // Print results
    console.log("=" .repeat(80));
    console.log("ORPHANED EVENT ACTUALS (Event doesn't exist):");
    console.log("=" .repeat(80));
    if (orphanedActuals.length === 0) {
      console.log("✓ No orphaned event actuals found\n");
    } else {
      orphanedActuals.forEach((item, index) => {
        console.log(`${index + 1}. EventActual ID: ${item._id}`);
        console.log(`   Event ID: ${item.eventId}`);
        console.log(`   Reason: ${item.reason}\n`);
      });
    }

    console.log("=" .repeat(80));
    console.log("EVENT ACTUALS WITH NON-DONE STATUS:");
    console.log("=" .repeat(80));
    if (notDoneActuals.length === 0) {
      console.log("✓ All event actuals have DONE status\n");
    } else {
      notDoneActuals.forEach((item, index) => {
        console.log(`${index + 1}. EventActual ID: ${item._id}`);
        console.log(`   Event ID: ${item.eventId}`);
        console.log(`   Event Number: ${item.eventNumber}`);
        console.log(`   Event Date: ${item.eventDate}`);
        console.log(`   Current Status: ${item.currentStatus}`);
        console.log(`   Reason: ${item.reason}\n`);
      });
    }

    console.log("=" .repeat(80));
    console.log("SUMMARY:");
    console.log("=" .repeat(80));
    console.log(`Total EventActuals: ${allActuals.length}`);
    console.log(`Orphaned (no event): ${orphanedActuals.length}`);
    console.log(`Non-DONE status: ${notDoneActuals.length}`);
    console.log(`Valid: ${allActuals.length - orphanedActuals.length - notDoneActuals.length}\n`);

    return {
      total: allActuals.length,
      orphaned: orphanedActuals,
      notDone: notDoneActuals,
      valid: allActuals.length - orphanedActuals.length - notDoneActuals.length
    };

  } catch (error) {
    console.error("Error finding orphaned event actuals:", error);
    throw error;
  }
}

/**
 * Delete all EventActual documents where the event status is not DONE
 * @returns {Object} Result with count of deleted documents
 */
async function deleteNonDoneEventActuals() {
  try {
    console.log("\n🔍 Finding EventActuals with non-DONE status...\n");

    // Get the "DONE" status ID
    const doneStatus = await EventStatus.findOne({ code: "DONE" });
    
    if (!doneStatus) {
      throw new Error("DONE status not found in database");
    }

    // Get all event actuals with populated event data
    const allActuals = await EventActual.find()
      .populate({
        path: "event",
        populate: { path: "status" }
      })
      .lean();

    // Find actuals where event exists but status is not DONE
    const toDelete = [];
    
    for (const actual of allActuals) {
      if (actual.event && actual.event.status && 
          actual.event.status._id.toString() !== doneStatus._id.toString()) {
        toDelete.push({
          _id: actual._id,
          eventId: actual.event._id,
          eventNumber: actual.event.eventNumber,
          currentStatus: actual.event.status.code
        });
      }
    }

    if (toDelete.length === 0) {
      console.log("✓ No EventActuals with non-DONE status found. Nothing to delete.\n");
      return { deletedCount: 0, deleted: [] };
    }

    // Show what will be deleted
    console.log(`Found ${toDelete.length} EventActual(s) to delete:\n`);
    toDelete.forEach((item, index) => {
      console.log(`${index + 1}. EventActual: ${item._id}`);
      console.log(`   Event #${item.eventNumber} (Status: ${item.currentStatus})\n`);
    });

    // Ask for confirmation (only in interactive mode)
    if (require.main === module) {
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question(`⚠️  Delete these ${toDelete.length} EventActual document(s)? (yes/no): `, (ans) => {
          rl.close();
          resolve(ans.toLowerCase());
        });
      });

      if (answer !== "yes" && answer !== "y") {
        console.log("\n❌ Deletion cancelled.\n");
        return { deletedCount: 0, deleted: [] };
      }
    }

    // Perform deletion
    const idsToDelete = toDelete.map(item => item._id);
    const result = await EventActual.deleteMany({ _id: { $in: idsToDelete } });

    console.log("\n" + "=".repeat(80));
    console.log("✅ DELETION COMPLETE");
    console.log("=".repeat(80));
    console.log(`Deleted: ${result.deletedCount} EventActual document(s)\n`);

    return {
      deletedCount: result.deletedCount,
      deleted: toDelete
    };

  } catch (error) {
    console.error("❌ Error deleting non-DONE event actuals:", error);
    throw error;
  }
}

// If run directly
if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bar-mis";
  
  // Check for command line argument
  const args = process.argv.slice(2);
  const shouldDelete = args.includes("--delete");

  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("MongoDB connected successfully");
      
      if (shouldDelete) {
        await deleteNonDoneEventActuals();
      } else {
        await findOrphanedEventActuals();
        console.log("\n💡 To delete EventActuals with non-DONE status, run:");
        console.log("   node src/utils/findOrphanedEventActuals.js --delete\n");
      }
      
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database connection error:", err);
      process.exit(1);
    });
}

module.exports = { findOrphanedEventActuals, deleteNonDoneEventActuals };
