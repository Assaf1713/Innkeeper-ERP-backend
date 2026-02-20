const axios = require("axios");

// // Create or update a contact in Brevo and assign to a list
// // Uses Brevo endpoint POST /v3/contacts and updateEnabled to avoid "already exists" errors.
async function upsertBrevoContact({ email, attributes = {}, listId }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing in environment");
  }
  if (!email) {
    throw new Error("Email is required to sync contact to Brevo");
  }

  const payload = {
    email,
    attributes,          // e.g. { FNAME: "John", LNAME: "Doe", SMS: "..." }
    listIds: [listId],   // assign to list ID
    updateEnabled: true, // if contact already exists, Brevo updates it instead of failing
  };

  const res = await axios.post("https://api.brevo.com/v3/contacts", payload, {
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    timeout: 10_000,
  });

  return res.data; // Brevo returns { id: 123 } on success :contentReference[oaicite:1]{index=1}
}

module.exports = {
  upsertBrevoContact,
};
