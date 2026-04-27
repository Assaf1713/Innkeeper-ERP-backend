const axios = require("axios");

const formatPhoneForBrevo = (phone) => {
  if (!phone) return "";

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If starts with 0, replace with +972 (Israel country code)
  if (digits.startsWith("0")) {
    return `+972${digits.substring(1)}`;
  }

  // If already starts with country code
  if (digits.startsWith("972")) {
    return `+${digits}`;
  }

  // If already has +, return as is
  if (phone.startsWith("+")) {
    return phone;
  }

  // Default: assume Israel number
  return `+972${digits}`;
};

// // Create or update a contact in Brevo and assign to a list
// // Uses Brevo endpoint POST /v3/contacts and updateEnabled to avoid "already exists" errors.
async function upsertBrevoContact({ customer, listId }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing in environment");
  }
  if (!customer?.email) {
    throw new Error("Email is required to sync contact to Brevo");
  }

  const payload = {
    email: customer.email,
    attributes: {
      FIRSTNAME: customer.name || "",
      SMS: formatPhoneForBrevo(customer.phone), // only if you store phone
      CUSTOMER_TYPE: customer.IsBusiness ? 1 : 2, // 1=Business, 2=private
      PAYING_CUSTOMER: customer.payingCustomer || false,
    },
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
