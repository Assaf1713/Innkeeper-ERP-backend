const Supplier = require("../models/Supplier");

const formatPhone = (phone) => {
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

// Get all suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(suppliers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching suppliers", error: error.message });
  }
};

// Get a single supplier by ID
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json(supplier);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching supplier", error: error.message });
  }
};

// Create a new supplier
exports.createSupplier = async (req, res) => {
  try {
    
    const newSupplier = new Supplier({
      ...req.body,
      phone: formatPhone(req.body.phone),
    });
    const savedSupplier = await newSupplier.save();
    res.status(201).json(savedSupplier);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating supplier", error: error.message });
  }
};

// Update a supplier
exports.updateSupplier = async (req, res) => {
  try {
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { ...req.body, phone: formatPhone(req.body.phone) },
      { new: true, runValidators: true },
    );
    if (!updatedSupplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json(updatedSupplier);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating supplier", error: error.message });
  }
};

// Soft delete a supplier (set isActive to false)
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json({ message: "Supplier deactivated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting supplier", error: error.message });
  }
};

// Reactivate a supplier (set isActive to true)
exports.reactivateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true },
    );
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json({ message: "Supplier reactivated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error reactivating supplier", error: error.message });
  }
};
