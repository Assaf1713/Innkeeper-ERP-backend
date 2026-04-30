const { getEventFinancials, getOperationalExpenses } = require('../services/financialReportService');

exports.getCashFlowReport = async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
     // we show all data
     startDate = new Date(0); // January 1, 1970
     endDate = new Date(); // current date
    } else {
     startDate = new Date(startDate);
     endDate = new Date(endDate);
    }

    // Ensure the end time covers the entire last day
    endDate.setHours(23, 59, 59, 999);

    // Run both database queries in parallel for maximum performance
    const [eventFinancials, generalExpenses] = await Promise.all([
      getEventFinancials(startDate, endDate),
      getOperationalExpenses(startDate, endDate)
    ]);

    // ==========================================
    // Calculate the financial balance (The Bottom Line)
    // ==========================================
    
    // Gross profit (revenue minus COGS of the events)
    const grossProfit = eventFinancials.totalRevenue - eventFinancials.totalDirectCosts;
    
    // Net profit (gross profit minus general operational expenses)
    const netProfit = eventFinancials.totalRevenue - eventFinancials.totalWages - eventFinancials.totalEventGeneral - generalExpenses.totalOpex;
    
    // Net profit margin
    const profitMargin = eventFinancials.totalRevenue > 0 
      ? ((netProfit / eventFinancials.totalRevenue) * 100).toFixed(2) 
      : 0;

    // Build the final response structure for the Frontend
    const reportData = {
      summary: {
        totalEvents: eventFinancials.eventCount,
        totalRevenue: eventFinancials.totalRevenue,
        totalDirectCosts: eventFinancials.totalDirectCosts,
        totalOperationalExpenses: generalExpenses.totalOpex,
        grossProfit,
        netProfit,
        profitMargin: Number(profitMargin)
      },
      // Breakdown of event costs (for charts or tables)
      cogsBreakdown: {
        wages: eventFinancials.totalWages,
        alcohol: eventFinancials.totalAlcohol,
        ice: eventFinancials.totalIce,
        generalEventExpenses: eventFinancials.totalEventGeneral
      },
      // Breakdown of general expenses by category (for a pie chart)
      opexBreakdown:{
        categoryStats: generalExpenses.categoryStats,
        ice: generalExpenses.categoryStats['קרח'] || 0

      } 
    };

    res.json(reportData);

  } catch (err) {
    console.error("Error generating cash flow report:", err);
    next(err);
  }
};