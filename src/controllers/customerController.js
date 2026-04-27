const Customer = require("../models/Customers");
const { upsertBrevoContact } = require("../services/brevoAddCustomer");
const {checkisBusiness} = require ("../services/emailClassificationHelper");



const IsExcistingCustomer = async (email) => {
  if (!email) return false;
  const existing = await Customer.findOne({
    email: email.trim().toLowerCase(),
  });
  return !!existing;
};

exports.SearchCustomerByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res
        .status(400)
        .json({ error: "Email query parameter is required" });
    }
    const customer = await Customer.findOne({
      email: email.trim().toLowerCase(),
    });
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
    if (email && (await IsExcistingCustomer(email))) {
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
      try {
        await upsertBrevoContact({
          customer,
          listId: 5,
        });
        // console.log success + reponse from brevo
        console.log(
          "Successfully SYNCED contact to Brevo:",
          res.status(200).data,
        );
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
    const {
      name,
      email,
      phone,
      company,
      companyId,
      IsBusiness,
      isActive,
      payingCustomer,
    } = req.body;

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
    if (payingCustomer !== undefined)
      customer.payingCustomer = !!payingCustomer;

    await customer.save();

    // Sync to Brevo if enabled
    if (process.env.BREVO_SYNC_ENABLED === "true" && customer.email) {
      try {
        await upsertBrevoContact({
          customer,
          listId: 5,
        });
      } catch (error) {
        console.error(
          "Failed to sync contact to Brevo:",
          error.response?.data || error.message,
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
