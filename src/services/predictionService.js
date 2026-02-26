// src/services/predictionService.js
const Event = require("../models/Events");
const AlcoholExpense = require("../models/AlcoholExpense");
const EventStatus = require("../models/EventStatus");

/**
 * Calculates statistics for a single category based on past events
 * Returns: { averagePerHead, stdDevPerHead }
 */
exports.calculateCategoryStats = async (eventType) => {
  // 1. Find relevant past events
  const closedStatuses = await EventStatus.find({ code: { $in: ["DONE"] } });
  const pastEvents = await Event.find({
    eventType: eventType,
    status: { $in: closedStatuses.map(s => s._id) },
    guestCount: { $gt: 0 }
  }).select("_id guestCount");

  if (pastEvents.length === 0) return null;

  // 2. Fetch alcohol expenses for these events
  const expenses = await AlcoholExpense.find({
    event: { $in: pastEvents.map(e => e._id) }
  }).populate("product");

  // 3. Create a data dictionary for consumption mapping
  const categoryConsumption = {}; // Structure: { 'Vodka': { eventId: totalMl } }

  expenses.forEach(exp => {
    if (!exp.product || !exp.bottlesUsed) return;
    const cat = exp.product.category || "אחר";
    const totalMl = exp.bottlesUsed * (exp.product.volumeMl || 0);
    const eventId = exp.event.toString();

    if (!categoryConsumption[cat]) categoryConsumption[cat] = {};
    if (!categoryConsumption[cat][eventId]) categoryConsumption[cat][eventId] = 0;
    categoryConsumption[cat][eventId] += totalMl;
  });

  // 4. Calculate statistics per category
  const results = {};
  
  // Helper map for quick guest count lookup
  const guestsMap = pastEvents.reduce((acc, curr) => {
    acc[curr._id.toString()] = curr.guestCount;
    return acc;
  }, {});

  for (const category in categoryConsumption) {
    const consumptionPerHead = pastEvents.map(e => {
      const eId = e._id.toString();
      const consumed = categoryConsumption[category][eId] || 0;
      return consumed / guestsMap[eId];
    });

    const sum = consumptionPerHead.reduce((a, b) => a + b, 0);
    const avg = sum / consumptionPerHead.length;
    const variance = consumptionPerHead.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / consumptionPerHead.length;
    
    results[category] = {
      averagePerHead: avg,
      stdDevPerHead: Math.sqrt(variance)
    };
  }

  return { stats: results, baseEventCount: pastEvents.length };
};