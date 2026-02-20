const Event = require("../models/Events");
const EventType = require("../models/EventType");
const LeadSource = require("../models/LeadSource");
const MenuType = require("../models/MenuType");
const EventStatus = require("../models/EventStatus");
const EventActual = require("../models/EventActual");
const Customers = require("../models/Customers");
const Lead = require("../models/Lead");
const CustomerController = require("./customerController");
const { upsertBrevoContact } = require("../services/brevoAddCustomer");
const { getTravelEstimate } = require("../services/googleMapsService");



const calculatePrice = (priceInput) => {
  // Handle null/undefined early
  if (priceInput == null) return 0;

  // Handle number input
  if (typeof priceInput === "number") {
    return isNaN(priceInput) ? 0 : priceInput;
  }

  // Handle string input
  if (typeof priceInput === "string") {
    const trimmed = priceInput.trim();

    // Handle empty string
    if (!trimmed) return 0;

    // Handle formula notation (e.g., "=1000+200-50")
    if (trimmed.startsWith("=")) {
      try {
        const expression = trimmed.slice(1);
        // Validate expression contains only numbers and math operators using regex
        if (!/^[\d+\-*/().\s]+$/.test(expression)) {
          throw new Error(
            `נוסחה לא חוקית: "${expression}" - השתמש רק במספרים ופעולות חשבון (+, -, *, /, סוגריים)`,
          );
        }
        // Use Function constructor safely (limited to math operations)
        const result = Function(`"use strict"; return (${expression})`)();
        if (isNaN(result) || !isFinite(result)) {
          throw new Error(`תוצאת הנוסחה אינה מספר תקין: "${expression}"`);
        }
        return Number(result);
      } catch (err) {
        if (err.message.includes("Unexpected token")) {
          throw new Error(
            `שגיאת תחביר בנוסחה: "${expression}" - בדוק סוגריים ופעולות חשבון`,
          );
        }
        throw new Error(
          `שגיאה בחישוב הנוסחה: "${expression}" - ${err.message}`,
        );
      }
    }

    // Handle regular numeric string (remove currency symbols, commas, etc.)
    const cleaned = trimmed.replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Handle unexpected types
  console.warn(`Unexpected price input type: ${typeof priceInput}`);
  return 0;
};

const LastThreeDays = () => {
  const now = new Date();
  const lastThreeDays = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  return lastThreeDays;
};

const checkisBusiness = (email) => {
  if (!email) return false;
  const businessDomains = [
    "info@",
    "contact@",
    "support@",
    "sales@",
    "service@",
    "admin@",
    "office@",
  ];
  const privateDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
  ];
  const emailLower = email.toLowerCase();
  for (const domain of businessDomains) {
    if (emailLower.includes(domain)) return true;
  }
  for (const domain of privateDomains) {
    if (emailLower.includes(domain)) return false;
  }
  return true;
};

// פונקציה לסגירת אירועים שפג תוקפם
const closeExpiredEvents = async () => {
  const maximumDate = LastThreeDays();
  try {
    const [notClosedStatus, lostStatus] = await Promise.all([
      EventStatus.findOne({ code: "NOT_CLOSED" }),
      EventStatus.findOne({ code: "LOST" }),
    ]);

    if (!notClosedStatus || !lostStatus) {
      console.error("Required statuses not found");
      return;
    }

    // Bulk update all expired events at once
    const result = await Event.updateMany(
      {
        eventDate: { $lt: maximumDate },
        status: notClosedStatus._id,
      },
      {
        $set: { status: lostStatus._id },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(
        `Closed ${result.modifiedCount} expired events to LOST status`,
      );
    }
  } catch (err) {
    console.error("Error closing expired events:", err);
  }
};

exports.listEvents = async (req, res, next) => {
  // Close expired events before listing
  await closeExpiredEvents();
  try {
    const events = await Event.find({})
      .populate("eventType", "code label")
      .populate("leadSource", "code label")
      .populate("menuType", "code label")
      .populate("status", "code label")
      .populate("customer", "phone email")
      .sort({ eventDate: 1 });
    res.json(events);
  } catch (err) {
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    // ====================================================================
    // STAGE 1: Extract and parse fields from request body
    // ====================================================================
    const {
      eventNumber,
      customerName,
      customerId,
      eventDate,
      guestCount,
      eventAddress,
      startTime,
      endTime,
      price,
      notes,
      eventTypeCode,
      leadSourceCode,
      menuTypeCode,
      statusCode,
      leadId,
      email,
      phone,
    } = req.body;

    // Convert and validate basic fields
    const guestCountNum = guestCount ? Number(guestCount) : 0;
    const priceNum = price ? Number(price) : 0;
    const eventDateObj = eventDate ? new Date(eventDate) : null;

    if (!customerName || !eventDateObj) {
      return res.status(400).json({ 
        error: "Customer name and event date are required fields", 
        number: 1 
      });
    }

    // ====================================================================
    // STAGE 2: Customer assignment logic
    // If event created from lead, ensure customer exists or create new one
    // ====================================================================
    let finalCustomerId = customerId;

    if (!finalCustomerId && leadId) {
      let customer = await Customers.findOne({
        email: email?.toLowerCase().trim(),
      });

      if (!customer) {
        // Validate required fields for new customer
        if (!customerName || !email || email.trim() === "") {
          console.log("Missing customerName or email for new customer creation");
          return res.status(400).json({ 
            error: "Customer name and email are required", 
            number: 2 
          });
        }

        // Create new customer
        customer = await Customers.create({
          name: customerName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || undefined,
          IsBusiness: checkisBusiness(email),
          payingCustomer: false,
        });
        console.log(`Created new customer ${customer._id} for event`);

        // Sync to Brevo CRM if enabled
        if (process.env.BREVO_SYNC_ENABLED === "true" && email) {
          const attributes = {
            FIRSTNAME: customer.name || "",
            CUSTOMER_TYPE: customer.IsBusiness ? 1 : 2,
            PAYING_CUSTOMER: customer.payingCustomer || false,
          };
          if (customer.phone) {
            attributes.SMS = customer.phone;
          }
          try {
            await upsertBrevoContact({
              email: customer.email,
              attributes,
              listId: 5,
            });
            console.log("Successfully synced contact to Brevo");
          } catch (error) {
            console.error("Failed to sync contact to Brevo:", error);
          }
        }
      }
      finalCustomerId = customer._id;
    }

    // ====================================================================
    // STAGE 3: Fetch default lookup values (parallel query for performance)
    // ====================================================================
    const [eventTypeDefault, leadSourceDefault, menuTypeDefault, statusDefault] = 
      await Promise.all([
        EventType.findOne({ isActive: true, label: "אירוע קוקטיילים פרטי" }),
        LeadSource.findOne({ isActive: true, label: "גוגל" }),
        MenuType.findOne({ isActive: true, label: "קלאסיק" }),
        EventStatus.findOne({ isActive: true, label: "לא נסגר" }),
      ]);

    if (!eventTypeDefault || !leadSourceDefault || !menuTypeDefault || !statusDefault) {
      return res.status(400).json({
        error: "Missing lookup values, run seed:lookups script",
        number: 3,
      });
    }

    // ====================================================================
    // STAGE 4: Resolve lookup codes to IDs (use provided codes or defaults)
    // ====================================================================
    const [eventType, leadSource, menuType, status] = await Promise.all([
      eventTypeCode
        ? EventType.findOne({ code: eventTypeCode, isActive: true })
        : Promise.resolve(eventTypeDefault),
      leadSourceCode
        ? LeadSource.findOne({ code: leadSourceCode, isActive: true })
        : Promise.resolve(leadSourceDefault),
      menuTypeCode
        ? MenuType.findOne({ code: menuTypeCode, isActive: true })
        : Promise.resolve(menuTypeDefault),
      statusCode
        ? EventStatus.findOne({ code: statusCode, isActive: true })
        : Promise.resolve(statusDefault),
    ]);

    if (!eventType || !leadSource || !menuType || !status) {
      return res.status(400).json({ 
        error: "Invalid lookup codes provided", 
        number: 4 
      });
    }

    // ====================================================================
    // STAGE 5: Calculate or validate event number
    // ====================================================================
    let nextNumber;
    if (eventNumber) {
      // Manual event number provided (for seeding purposes)
      nextNumber = Number(eventNumber);
      const existingEvent = await Event.findOne({ eventNumber: nextNumber });
      if (existingEvent) {
        return res.status(400).json({
          error: `Event number ${nextNumber} already exists`,
          number: 5,
        });
      }
    } else {
      // Auto-generate: find max eventNumber and increment
      const maxEvent = await Event.findOne().sort({ eventNumber: -1 }).limit(1);
      nextNumber = maxEvent ? maxEvent.eventNumber + 1 : 1000;
    }

    // ====================================================================
    // STAGE 6: Get travel estimate from Google Maps API
    // ====================================================================
    let travelDistance = null;
    let travelDuration = null;
    
    if (eventAddress) {
      const estimate = await getTravelEstimate(eventAddress, eventDate);
      if (estimate) {
        console.log("Got travel estimate:", estimate);
        travelDistance = estimate.distanceValue; // meters
        travelDuration = estimate.durationValue; // seconds
      }
    }

    // ====================================================================
    // STAGE 7: Create event document in database
    // ====================================================================
    const newEvent = await Event.create({
      eventNumber: nextNumber,
      customerName: customerName,
      customer: finalCustomerId || null,
      eventDate: eventDateObj,
      address: eventAddress || "",
      startTime: startTime || "",
      endTime: endTime || "",
      guestCount: guestCountNum,
      eventType: eventType._id,
      leadSource: leadSource._id,
      menuType: menuType._id,
      status: status._id,
      price: priceNum,
      notes: notes || "",
      travelDistance,
      travelDuration,
    });

    // ====================================================================
    // STAGE 8: Update lead status if event created from lead
    // This closes the circle: Lead -> Customer -> Event
    // ====================================================================
    if (leadId) {
      await Lead.findByIdAndUpdate(leadId, {
        status: "Qualified",
        relatedCustomer: finalCustomerId,
        relatedEvent: newEvent._id,
      });
      console.log(`Lead ${leadId} qualified and linked to event ${newEvent._id}`);
    }

    // ====================================================================
    // STAGE 9: Populate lookups for response
    // ====================================================================
    await newEvent.populate([
      { path: "eventType", select: "code label" },
      { path: "leadSource", select: "code label" },
      { path: "menuType", select: "code label" },
      { path: "status", select: "code label" },
      { path: "customer", select: "name email phone" },
    ]);

    // ====================================================================
    // STAGE 10: Return success response
    // ====================================================================
    return res.status(201).json({ event: newEvent });
  } catch (err) {
    console.error("Error creating event:", err);
    next(err);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("eventType", "code label")
      .populate("leadSource", "code label")
      .populate("menuType", "code label")
      .populate("status", "code label")
      .populate("customer", "name email phone");

    if (!event) return res.status(404).json({ error: "Event not found" });

    return res.json({ event });
  } catch (err) {
    next(err);
  }
};

exports.ensureEventActual = async (eventId) => {
  try {
    const existing = await EventActual.findOne({ event: eventId });
    if (!existing) {
      await EventActual.create({ event: eventId });
    }
  } catch (err) {
    console.error("Error ensuring EventActual:", err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const {
      customerName,
      customerId,
      eventDate,
      guestCount,
      eventAddress,
      startTime,
      endTime,
      price,
      notes,
      eventTypeCode,
      leadSourceCode,
      menuTypeCode,
      statusCode,
    } = req.body;

    const patch = {};

    // Basic conversions:
    if (customerName !== undefined) patch.customerName = customerName;
    if (customerId !== undefined) patch.customer = customerId || null;
    if (eventDate !== undefined)
      patch.eventDate = eventDate ? new Date(eventDate) : null;
    if (guestCount !== undefined) patch.guestCount = Number(guestCount) || 0;
    if (eventAddress !== undefined) patch.address = eventAddress || "";
    if (notes !== undefined) patch.notes = notes || "";
    if (startTime !== undefined) patch.startTime = startTime || "";
    if (endTime !== undefined) patch.endTime = endTime || "";

    // Handle price with error catching
    if (price !== undefined) {
      try {
        patch.price = calculatePrice(price);
      } catch (priceError) {
        return res.status(400).json({
          error: priceError.message,
          field: "price", // Optional: help frontend identify which field has error
        });
      }
    }

    // Lookups לפי code -> _id
    const [eventType, leadSource, menuType, status, customer] =
      await Promise.all([
        eventTypeCode
          ? EventType.findOne({ code: eventTypeCode, isActive: true })
          : null,
        leadSourceCode
          ? LeadSource.findOne({ code: leadSourceCode, isActive: true })
          : null,
        menuTypeCode
          ? MenuType.findOne({ code: menuTypeCode, isActive: true })
          : null,
        statusCode
          ? EventStatus.findOne({ code: statusCode, isActive: true })
          : null,
        customerId ? Customers.findById(customerId) : null,
      ]);

    if (eventTypeCode && !eventType)
      return res.status(400).json({ error: "Invalid eventTypeCode" });
    if (leadSourceCode && !leadSource)
      return res.status(400).json({ error: "Invalid leadSourceCode" });
    if (menuTypeCode && !menuType)
      return res.status(400).json({ error: "Invalid menuTypeCode" });
    if (statusCode && !status)
      return res.status(400).json({ error: "Invalid statusCode" });
    if (customerId && !customer)
      return res.status(400).json({ error: "Invalid customerId" });
    if (eventType) patch.eventType = eventType._id;
    if (leadSource) patch.leadSource = leadSource._id;
    if (menuType) patch.menuType = menuType._id;
    if (status) patch.status = status._id;
    if (customer) patch.customer = customer._id;

    

    // Get current event to check previous status
    const currentEvent = await Event.findById(req.params.id).populate(
      "status",
      "code",
    );
    if (!currentEvent)
      return res.status(404).json({ error: "Event not found" });

    // 2. Check: Do we need to recalculate the route?
    // Trigger if address changed OR date changed
    const isAddressChanged = patch.address && patch.address !== currentEvent.address;
    const isDateChanged = patch.eventDate && new Date(patch.eventDate).getTime() !== new Date(currentEvent.eventDate).getTime();

    // Perform calculation if changed, or if data is missing (legacy events)
    const needsCalculation = isAddressChanged || isDateChanged || (!currentEvent.travelDistance && currentEvent.address);

    if (needsCalculation) {
        console.log("Calculating travel estimate via Google Maps...");
        
        // Use new address/date if provided in patch, otherwise fallback to current DB value
        const targetAddress = patch.address || currentEvent.address;
        const targetDate = patch.eventDate || currentEvent.eventDate;

        // Call the service
        const estimate = await getTravelEstimate(targetAddress, targetDate);

        if (estimate) {
            console.log("Got estimate:", estimate);
            patch.travelDistance = estimate.distanceValue; // Store in meters
            patch.travelDuration = estimate.durationValue; // Store in seconds
        }
    }


    const updated = await Event.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    })
      .populate("eventType", "code label")
      .populate("leadSource", "code label")
      .populate("menuType", "code label")
      .populate("status", "code label")
      .populate("customer", "name email phone payingCustomer");

    if (!updated) return res.status(404).json({ error: "Event not found" });
    const linkedLead = await Lead.findOne({ relatedEvent: req.params.id });

    // HANDLE STATUS CHANGE LOGIC > PREV STATUS -> DONE

    // Auto-create EventActual if status is DONE
    if (status && status.code === "DONE") {
      await exports.ensureEventActual(req.params.id);
      // auto change lead status to Converted if leadId provided
      if (linkedLead) {
        linkedLead.status = "Converted";
        await linkedLead.save();
        console.log(
          `Lead ${linkedLead._id} converted and linked to event ${req.params.id}`,
        );
      }

      // Update the customer paying status to true in MONGO DB
      if (customer) {
        customer.payingCustomer = true;
        await customer.save();
        console.log(
          `Customer ${customer._id} paying status set to true for event ${req.params.id}`,
        );
      }

      // Sync customer paying status to BREVO if enabled
      if (process.env.BREVO_SYNC_ENABLED === "true" && customer) {
        console.log(
          `Setting Customer ${customer._id} paying status to true in Brevo for event ${req.params.id}`,
        );
        const attributes = {
          PAYING_CUSTOMER: true,
        };
        try {
          await upsertBrevoContact({
            email: customer.email,
            attributes,
            listId: 5,
          });
          // console.log success + reponse from brevo
          console.log(
            "Successfully synced contact to Brevo:",
            res.status(200).data,
          );
        } catch (error) {
          console.error("Failed to sync contact to Brevo:", error);
        }
      }
    }

    // HANDLE STATUS CHANGE LOGIC > DONE -> OTHER STATUS

    // Auto-delete EventActual if status changed from DONE to LOST or any other non-DONE status
    if (
      status &&
      currentEvent.status?.code === "DONE" &&
      status.code !== "DONE"
    ) {
      const deletedActual = await EventActual.findOneAndDelete({
        event: req.params.id,
      });
      if (deletedActual) {
        console.log(
          `Deleted EventActual for event ${currentEvent.eventNumber} (status changed from DONE to ${status.code})`,
        );
      }
      // auto change lead status back to Qualified if leadId provided
      if (linkedLead) {
        linkedLead.status = "Qualified";
        await linkedLead.save();
        console.log(
          `Lead ${linkedLead._id} status reverted to Qualified for event ${req.params.id}`,
        );
      }
      // auto change the customer paying status to false in BREVO if enabled
      if (process.env.BREVO_SYNC_ENABLED === "true" && customer) {
        console.log(
          `Setting Customer ${customer._id} paying status to false in Brevo for event ${req.params.id}`,
        );
        const attributes = {
          PAYING_CUSTOMER: false,
        };
        try {
          await upsertBrevoContact({
            email: customer.email,
            attributes,
            listId: 5,
          });
          // console.log success + reponse from brevo
          console.log(
            "Successfully synced contact to Brevo:",
            res.status(200).data,
          );
        } catch (error) {
          console.error("Failed to sync contact to Brevo:", error);
        }
      }
    }

    return res.json({ event: updated });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/close-details
exports.saveCloseEventDetails = async (req, res, next) => {
  try {
    const { warehouseArrivalTime, promisedStaffCount, cocktailMenu } = req.body;
    const patch = {};
    const defaultCocktailMenu = "בהמה מאמא | באזיל | זפירו | סירנה";

    if (warehouseArrivalTime !== undefined)
      patch.warehouseArrivalTime = warehouseArrivalTime || "TBD";
    if (promisedStaffCount !== undefined)
      patch.promisedStaffCount = promisedStaffCount;
    if (cocktailMenu !== undefined)
      patch.cocktailMenu = cocktailMenu || defaultCocktailMenu;

    const updated = await Event.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    })
      .populate("eventType", "code label")
      .populate("leadSource", "code label")
      .populate("menuType", "code label")
      .populate("status", "code label");
    if (!updated) return res.status(404).json({ error: "Event not found" });

    return res.json({ event: updated });
  } catch (err) {
    next(err);
  }
};

// Add ice expenses update handler
exports.updateIceExpenses = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined ) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    let calculatedAmount;
    try {
      calculatedAmount = calculatePrice(amount);
      } catch (priceError) {
        return res.status(400).json({
          error: priceError.message,
          field: "price"
        });
      }

    // Update EventActual, not Event
    const eventActual = await EventActual.findOneAndUpdate(
      { event: id },
      { iceExpense: calculatedAmount },
      { new: true, upsert: true },
    );

    res.json({ eventActual, message: "Ice expenses updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.ListofClosedEventsDates = async (req, res, next) => {
  try {
    const closedStatus = await EventStatus.findOne({ code: "CLOSED" });
    if (!closedStatus) {
      return res.status(400).json({ error: "Closed status not found" });
    }
    const closedEvents = await Event.find({ status: closedStatus._id }).select(
      "eventDate",
    );
    const closedDates = closedEvents.map((ev) => ev.eventDate);
    res.json(closedDates);
  } catch (err) {
    next(err);
  }
};

exports.seedOneEvent = async (req, res, next) => {
  try {
    console.log("Seeding one event...");
    // לוקחים ערכים ראשונים פעילים
    const [eventType] = await EventType.find({ isActive: true }).limit(1);
    const [leadSource] = await LeadSource.find({ isActive: true }).limit(1);
    const [menuType] = await MenuType.find({ isActive: true }).limit(1);
    const [status] = await EventStatus.find({ isActive: true }).limit(1);

    if (!eventType || !leadSource || !menuType || !status) {
      return res
        .status(400)
        .json({ error: "Missing lookup values — run seed:lookups first" });
    }

    const nextNumber = (await Event.countDocuments()) + 1000; // לדוגמה: מתחילים מ-1000
    const today = new Date();
    const plus7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const doc = await Event.create({
      eventNumber: nextNumber,
      customerName: "דנה כהן",
      eventDate: plus7,
      address: "תל אביב, ישראל",
      guestCount: 120,
      startTime: "19:00",
      endTime: "23:00",
      eventType: eventType._id,
      leadSource: leadSource._id,
      menuType: menuType._id,
      status: status._id,
      price: 14500,
      depositPaid: 2000,
      notes: "אירוע בדיקה מה-API",
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};
