const eventTypes = require ("../models/EventType");

exports.getEventTypesDict = async () => {
    try {
    const types = await eventTypes.find({});
    const dict = {};
    types.forEach(type => {
        dict[type.code] = type._id;
    });
    return dict;
    } catch (err) {
        console.error("Error fetching event types:", err);
        throw new Error("Failed to fetch event types");
    }
};