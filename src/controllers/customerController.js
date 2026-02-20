const Customer = require("../models/Customers");
const { upsertBrevoContact } = require("../services/brevoAddCustomer");

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
    "company.com",
    "business.com",
    "enterprise.com",
    "corporate.com",
  ];
  const privateDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
    "mail.com",
    "gmx.com",
    "protonmail.com",
  ];
  const emailLower = email.toLowerCase();
  for (const domain of businessDomains) {
    if (emailLower.includes(domain)) {
      return true;
    }
  }
  for (const domain of privateDomains) {
    if (emailLower.includes(domain)) {
      return false;
    }
  }

  return true;
};

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

const IsExcistingCustomer = async (email) => {
  if (!email) return false;
  const existing = await Customer.findOne({ email: email.trim().toLowerCase() });
  return !!existing;
};

exports.SearchCustomerByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email query parameter is required" });
    }
    const customer = await Customer.findOne({ email: email.trim().toLowerCase() });
    if (!customer) {
      return null; // No customer found
    }
    res.json({ customer });
  } catch (err) {
    next(err);
  }
};

exports.listCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json({ customers });
  } catch (err) {
    next(err);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, company, companyId, IsBusiness } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "שם לקוח הוא שדה חובה" });
    }
    if (email && await IsExcistingCustomer(email)) {
      return res.status(400).json({ error: "כתובת המייל כבר קיימת במערכת" });
    }

    const customer = await Customer.create({
      name: name.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      company: company?.trim() || undefined,
      companyId: companyId?.trim() || undefined,
      IsBusiness: checkisBusiness(email) || false,
      payingCustomer: false, // default to false on creation
    });
    // Sync to Brevo if enabled
    if (process.env.BREVO_SYNC_ENABLED === "true" && email) {
      const attributes = {
        FIRSTNAME: customer.name || "",
        SMS: customer.phone || "", // only if you store phone
        CUSTOMER_TYPE: customer.IsBusiness ? 1 : 2, // 1=Business, 2=private
        PAYING_CUSTOMER: customer.payingCustomer || false,
      };
      if (customer.phone) {
        attributes.SMS = formatPhoneForBrevo(customer.phone);
      }
      try {
        await upsertBrevoContact({
          email: customer.email,
          attributes,
          listId: 5,
        });
        // console.log success + reponse from brevo
        console.log("Successfully synced contact to Brevo:", res.status(200).data);
  
      } catch (error) {
        console.error("Failed to sync contact to Brevo:", error);
      }
    }

    res.status(201).json({ customer });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "כתובת המייל כבר קיימת במערכת" });
    }
    next(err);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "לקוח לא נמצא" });
    }
    res.json({ customer });
  } catch (err) {
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, company, companyId, IsBusiness, isActive, payingCustomer } =
      req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "לקוח לא נמצא" });
    }

    if (name !== undefined) customer.name = name.trim();
    if (email !== undefined) customer.email = email?.trim() || undefined;
    if (phone !== undefined) customer.phone = phone?.trim() || undefined;
    if (company !== undefined) customer.company = company?.trim() || undefined;
    if (companyId !== undefined)
      customer.companyId = companyId?.trim() || undefined;
    if (IsBusiness !== undefined) customer.IsBusiness = !!IsBusiness;
    if (isActive !== undefined) customer.isActive = !!isActive;
    if (payingCustomer !== undefined) customer.payingCustomer = !!payingCustomer;

    await customer.save();

    // Sync to Brevo if enabled
    if (process.env.BREVO_SYNC_ENABLED === "true" && customer.email) {
      const attributes = {
        FIRSTNAME: customer.name || "",
        CUSTOMER_TYPE: customer.IsBusiness ? 1 : 2,
        PAYING_CUSTOMER: customer.payingCustomer || false,
      };

      // Only add SMS if phone exists and format it correctly
      if (customer.phone) {
        attributes.SMS = formatPhoneForBrevo(customer.phone);
      }

      try {
        await upsertBrevoContact({
          email: customer.email,
          attributes,
          listId: 5,
        });
      } catch (error) {
        console.error(
          "Failed to sync contact to Brevo:",
          error.response?.data || error.message
        );
        // Don't fail the update if Brevo sync fails
      }
    }

    res.json({ customer });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "כתובת המייל כבר קיימת במערכת" });
    }
    next(err);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "לקוח לא נמצא" });
    }
    res.json({ message: "לקוח נמחק בהצלחה" });
  } catch (err) {
    next(err);
  }
};



