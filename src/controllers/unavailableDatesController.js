const UnavailableDates = require('../models/UnavailableDates');

// GET all unavailable dates (only active ones)
const getUnavailableDates = async (req, res) => {
    try {
        // Soft delete past dates before fetching
        const today = new Date().toISOString().split('T')[0];
        await UnavailableDates.updateMany(
            { blockedDate: { $lt: today }, isActive: true },
            { isActive: false }
        );

        const unavailableDates = await UnavailableDates.find({ isActive: true }).sort({ blockedDate: 1 });
        res.json(unavailableDates);
    } catch (error) {
        console.error('Error fetching unavailable dates:', error);
        res.status(500).json({ message: 'Error fetching unavailable dates', error: error.message });
    }
};

// POST add unavailable date(s) - supports single date or range
const addUnavailableDate = async (req, res) => {
    try {
        const { blockedDate, startDate, endDate, reason } = req.body;

        // Case 1: Single date
        if (blockedDate) {
            const existingDate = await UnavailableDates.findOne({ blockedDate });
            if (existingDate) {
                return res.status(400).json({ message: 'This date is already blocked', number: 3 });
            }

            const newUnavailableDate = new UnavailableDates({
                blockedDate,
                reason: reason || ''
            });

            await newUnavailableDate.save();
            return res.status(201).json(newUnavailableDate);
        }

        // Case 2: Date range
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
                return res.status(400).json({ message: 'Start date must be before or equal to end date', number:1 });
            }

            const datesToAdd = [];
            const currentDate = new Date(start);

            // Generate all dates in the range
            while (currentDate <= end) {
                const dateString = currentDate.toISOString().split('T')[0];
                datesToAdd.push({
                    blockedDate: dateString,
                    reason: reason || ''
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Check for existing dates
            const existingDates = await UnavailableDates.find({
                blockedDate: { $in: datesToAdd.map(d => d.blockedDate) }
            });

            if (existingDates.length > 0) {
                const existingDateStrings = existingDates.map(d => d.blockedDate).join(', ');
                return res.status(400).json({ 
                    message: `Some dates are already blocked: ${existingDateStrings}`,
                    number: 2
                });
            }

            // Insert all dates
            const insertedDates = await UnavailableDates.insertMany(datesToAdd);
            return res.status(201).json({ 
                message: `${insertedDates.length} dates blocked successfully`,
                dates: insertedDates 
            });
        }

        return res.status(400).json({ 
            message: 'Please provide either blockedDate or both startDate and endDate' 
        });

    } catch (error) {
        console.error('Error adding unavailable date:', error);
        res.status(500).json({ message: 'Error adding unavailable date', error: error.message });
    }
};

// DELETE remove unavailable date by ID (soft delete)
const removeUnavailableDate = async (req, res) => {
    try {
        const { id } = req.params;

        const updatedDate = await UnavailableDates.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!updatedDate) {
            return res.status(404).json({ message: 'Unavailable date not found' });
        }

        res.json({ message: 'Unavailable date removed successfully', date: updatedDate });
    } catch (error) {
        console.error('Error removing unavailable date:', error);
        res.status(500).json({ message: 'Error removing unavailable date', error: error.message });
    }
};

module.exports = {
    getUnavailableDates,
    addUnavailableDate,
    removeUnavailableDate
};
