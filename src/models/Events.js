const mongoose = require("mongoose");

const ONLY_HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/; // ולידציה ל-"HH:mm"

const eventSchema = new mongoose.Schema(
  {
    eventNumber: { type: Number, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customer: {type: mongoose.Schema.Types.ObjectId, ref: "Customer" }, // optional link to Customer model
    eventDate: { type: Date, required: true },
    address: { type: String, trim: true },
    guestCount: { type: Number, min: 0, default: 0 },
    startTime: { type: String, match: ONLY_HH_MM }, // "HH:mm"
    endTime: { type: String, match: ONLY_HH_MM }, // "HH:mm"

    eventType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventType",
      required: true,
    },
    leadSource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadSource",
      required: true,
      default: "GOOGLE",
    },
    menuType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuType",
      required: true,
      default: "CLASSIC",
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventStatus",
      required: true,
      default: "NOT_CLOSED",
    },

    price: { type: Number, min: 0, default: 0 },
    depositPaid: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true },

    // Google Distance Matrix results (optional, can be filled in later):
    travelDistance: { type: Number, default: 0 }, //  Distance in meters
    travelDuration: { type: Number, default: 0 }, // Duration in seconds

    // fields that are relevant for events with status "closed" :

    warehouseArrivalTime: { type: String, default: "" },
    promisedStaffCount: { type: Number, default: 0 },

    // the menu as a multi-line string
    cocktailMenu: { type: String, default: "בהמה מאמא | באזיל | סירנה | זאפירו" },
    closedAt: { type: Date },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

// אינדקסים שימושיים לחיפושים/דוחות:
eventSchema.index({ eventDate: 1 }); // לפי תאריך אירוע
eventSchema.index({ customerName: 1 }); // לפי שם לקוח
eventSchema.index({ status: 1, eventDate: 1 }); // לפי סטטוס ותאריך אירוע
// more useful indexes :
eventSchema.index({ eventType: 1 }); // לפי סוג אירוע  



module.exports = mongoose.model("Event", eventSchema);
