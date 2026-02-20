const { Client } = require("@googlemaps/google-maps-services-js");

const client = new Client({});
const WAREHOUSE_ADDRESS = process.env.WAREHOUSE_ADDRESS || "Tel Aviv, Israel";

exports.getTravelEstimate = async (destinationAddress, eventDate) => {
  try {
    if (!destinationAddress) return null;

    // 1. Base date setup
    let departureTime = eventDate ? new Date(eventDate) : new Date();

    // 2. Set strict departure time to 17:00 (5:00 PM)
    // This ensures we calculate traffic based on rush hour
    departureTime.setHours(17, 0, 0, 0);

    // 3. Handle Past Dates Logic (Crucial for Google API)
    // Google's predictive traffic only works for FUTURE times.
    // If the event date (at 17:00) is in the past, we move it 7 days forward
    // to simulate "typical traffic for this day of the week".
    const now = new Date();
    if (departureTime < now) {
        // Add 7 days until it's in the future
        while (departureTime < now) {
            departureTime.setDate(departureTime.getDate() + 7);
        }
    }

    const response = await client.distancematrix({
      params: {
        origins: [WAREHOUSE_ADDRESS],
        destinations: [destinationAddress],
        key: process.env.GOOGLE_MAPS_API_KEY,
        departure_time: departureTime, 
        language: "he",
        traffic_model: "best_guess" // Now this will actually work because time is in future
      },
    });

    if (response.data.status !== "OK") {
      console.error("Google Maps API Error:", response.data.error_message);
      return null;
    }

    const element = response.data.rows[0].elements[0];

    if (element.status !== "OK") {
      console.warn("Google Maps could not find route:", element.status);
      return null;
    }

    // 4. Prefer duration_in_traffic
    // Now that we sent a valid future departure_time, 'duration_in_traffic' should be present.
    // We prioritize it over standard 'duration'.
    const finalDurationText = element.duration_in_traffic 
        ? element.duration_in_traffic.text 
        : element.duration.text;
        
    const finalDurationValue = element.duration_in_traffic 
        ? element.duration_in_traffic.value 
        : element.duration.value;

    return {
      distanceText: element.distance.text,
      distanceValue: element.distance.value,
      durationText: finalDurationText, 
      durationValue: finalDurationValue
    };

  } catch (error) {
    console.error("Service Error - getTravelEstimate:", error.message);
    return null; 
  }
};