// Test function for Meta's default hello_world template
const testHelloWorld = async (phoneNumber) => {
  try {
    // Format phone number to standard international format (e.g., 972545436888)
    const formattedPhone = phoneNumber.startsWith("0") 
      ? `972${phoneNumber.substring(1)}` 
      : phoneNumber;

    const ACCESS_TOKEN = "EAAU4HIFjR4wBQ5qBISjBIsJKZB6rIhjSWHtEj9uZB1mSIy5kczJGfj8ln11dRfPktaKfZBirGc1RFg8HQ9lRX4yonm7b4UDR0Budbg4tUUwmVr2HKfn2jiyMb3rkjAZBcmtXZAHWZBpVjilWSayKIstRu4pXwKe6Tk2UjmGgdx3Qp8ZBfHulkhNIyZAUBrDIhwZDZD";
    const PHONE_NUMBER_ID = "993463503853327";
    
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    // The payload for hello_world has no dynamic components
    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US" // The default hello_world is in English
        }
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
    }

    console.log("Success! hello_world sent. Message ID:", data.messages[0].id);
    
  } catch (error) {
    console.error("Failed to send hello_world:", error.message);
  }
};




module.exports = { testHelloWorld };
