const EventActual = require("../models/EventActual");
const PriceListRule = require("../models/PriceListRule");
const EventType = require("../models/EventType");
const Event = require("../models/Events");

exports.getPricingAnalysis = async (req, res, next) => {
  try {
    const { eventTypeCode, guestCount } = req.query;

    // Convert code to ObjectId for Event lookup
    const eventType = await EventType.findOne({ code: eventTypeCode });
    if (!eventType) {
      return res.json({
        history: {
          samples: 0,
          alcoholPerHead: 30,
          wagesPerHead: 0,
          totalExpenses: 0, 
          totalPerHead: 0,
          stdDevTotalExpenses: 0,
          stdDevTotalPerHead: 0,
        },
        recommendation: null,
      });
    }

    // 1. Historical Analysis (The "Reality Check")
    // Find past events of same type with guests count +/- 30%
    const minG = Number(guestCount) * 0.7;
    const maxG = Number(guestCount) * 1.3;

    const historyStats = await EventActual.aggregate([
      // Join with Event collection to get eventType
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "eventData",
        },
      },
      // Unwind the array
      {
        $unwind: "$eventData",
      },
      // Match criteria
      {
        $match: {
          "eventData.eventType": eventType._id,
          guestCountSnapshot: { $gte: minG, $lte: maxG },
          totalExpenses: { $gt: 0 },
        },
      },
      // Group and calculate stats
      {
        $group: {
          _id: null,
          avgAlcoholPerHead: { $avg: "$alcoholPerHead" },
          stdDevAlcohol: { $stdDevPop: "$alcoholPerHead" },
          avgWagesPerHead: { $avg: "$wagePerHead" },
          stdDevWages: { $stdDevPop: "$wagePerHead" },
          avgIceExpenses: { $avg: "$totalIceExpenses}" },
          stdDevIce: { $stdDevPop: "$totalIceExpenses" },
          // --- NEW FIELDS ---
          avgTotalExpenses: { $avg: "$totalExpenses" },
          stdDevTotalExpenses: { $stdDevPop: "$totalExpenses" },
          avgTotalPerHead: { $avg: "$totalExpensePerHead" },
          stdDevTotalPerHead: { $stdDevPop: "$totalExpensePerHead" },
          // ------------------
          count: { $sum: 1 },
        },
      },
    ]);

    // 2. Rule Based Analysis (The "Price List")
    const matchingRule = await PriceListRule.findOne({
      eventTypes: eventTypeCode,
      minGuests: { $lte: Number(guestCount) },
      maxGuests: { $gte: Number(guestCount) },
      isActive: true,
    }).sort({ basePrice: -1 }); // Get the highest matching price (usually most specific)

    // Process stats
    const stats = historyStats[0] || {
      avgAlcoholPerHead: 0,
      stdDevAlcohol: 0,
      count: 0,
      avgWagesPerHead: 0,
      stdDevWages: 0,
      avgIceExpenses: 0,
      stdDevIce: 0,
      avgTotalExpenses: 0,
      stdDevTotalExpenses: 0,
      avgTotalPerHead: 0,
      stdDevTotalPerHead: 0,
    };

    // Calculate "Safe" Alcohol cost (Average + 1 Standard Deviation)
    // This ensures we cover ~84% of cases
    const safeAlcoholPerHead =
      (stats.avgAlcoholPerHead || 30) + (stats.stdDevAlcohol || 0);
    const safeWagesPerHead =
      (stats.avgWagesPerHead || 0) + (stats.stdDevWages || 0);
    const safeIceExpenses =
      (stats.avgIceExpenses || 0) + (stats.stdDevIce || 0);

    res.json({
      history: {
        samples: stats.count,
        alcoholPerHead: safeAlcoholPerHead, // Recommended safe value
        wagesPerHead: safeWagesPerHead,
        iceExpenses: safeIceExpenses,
        totalExpenses: stats.avgTotalExpenses || 0,
        totalPerHead: stats.avgTotalPerHead || 0,
        stdDevTotalExpenses: stats.stdDevTotalExpenses || 0,
        stdDevTotalPerHead: stats.stdDevTotalPerHead || 0,
      },
      recommendation: matchingRule
        ? {
            name: matchingRule.name,
            price: matchingRule.basePrice,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};
