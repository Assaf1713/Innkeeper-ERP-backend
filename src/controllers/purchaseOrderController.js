const PurchaseOrder = require("../models/PurchaseOrder");
const Event = require("../models/Events");
const Products = require("../models/InventoryProduct");
const Expenses = require("../models/Expenses");

// util function to process order after it's marked as SENT - create expense record and (in the future) update inventory quantities
const postOrderProcessing = async (order, TotalAmountPaid) => {
  // check if order already has a related expense record to prevent duplicates in case of multiple status updates - if it exists, we will update the existing record instead of creating a new one
  if (order.relatedExpense) {
    console.log("Updating existing expense record for order:", order._id);
    await Expenses.findByIdAndUpdate(order.relatedExpense, {
      price: TotalAmountPaid, // in case of partial payment, we want to update the expense record to reflect the actual amount paid
    });
    return;
  }

  try {
    const expenseData = {
      name: "מלאי",
      supplier: order.supplier?.name || null,
      category: "מלאי",
      date: order.orderDate || new Date(),
      price: TotalAmountPaid, // in case of partial payment, we want to update the expense record to reflect the actual amount paid
      notes: `הזמנה #${order.orderNumber}`,
    };
    const expenseRecord = new Expenses(expenseData);
    await expenseRecord.save();
    order.relatedExpense = expenseRecord._id;
    await order.save();
    console.log("Expense record created for order:", order._id);
  } catch (error) {
    console.error("Error creating expense record for order:", error);
  }
};
// util function to process return orders after they're marked as SENT - create negative expense record and (in the future) update inventory quantities
const postReturnProcessing = async (order, TotalAmountPaid) => {
  // check if order already has a related expense record to prevent duplicates in case of multiple status updates - if it exists, we will update the existing record instead of creating a new one
  if (order.relatedExpense) {
    const expensePrice = -Math.abs(TotalAmountPaid);
    await Expenses.findByIdAndUpdate(order.relatedExpense, {
      price: expensePrice,
    });
    return;
  }
  try {
    const expenseData = {
      name: "החזרת מלאי",
      supplier: order.supplier?.name || null,
      category: "INVENTORY",
      date: order.orderDate || new Date(),
      price: -Math.abs(TotalAmountPaid), // negative value to reflect return
      notes: `החזרת מלאי - הזמנה #${order.orderNumber}`,
    };
    const expenseRecord = new Expenses(expenseData);
    await expenseRecord.save();
    order.relatedExpense = expenseRecord._id;
    await order.save();
    console.log("Expense record created for return order:", order._id);
  } catch (error) {
    console.error("Error creating expense record for return order:", error);
  }
};
// Get all purchase orders
exports.getOrders = async (req, res) => {
  try {
    // Populate supplier details for the list view
    const orders = await PurchaseOrder.find()
      .populate("supplier", "name contactName phone")
      .populate("items.product", "code label superCategory netPrice notes")
      .populate("relatedEvent", "eventNumber eventDate address startTime")
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
};

// Get a single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate("supplier", "name contactName phone")
      .populate("items.product", "code label superCategory netPrice notes")
      .populate(
        "relatedEvent",
        "eventNumber eventDate address startTime guestCount customerName status",
      );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching order", error: error.message });
  }
};

// Create a new purchase order
exports.createOrder = async (req, res) => {
  try {
    // Calculate total amount from items if not provided or to ensure accuracy
    let calculatedTotal = 0;
    if (req.body.items && req.body.items.length > 0) {
      calculatedTotal = req.body.items.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0,
      );
    }

    const orderData = {
      ...req.body,
      totalAmount: req.body.totalAmount || calculatedTotal,
    };

    const newOrder = new PurchaseOrder(orderData);
    const savedOrder = await newOrder.save();

    const populatedOrder = await PurchaseOrder.findById(savedOrder._id)
      .populate("supplier", "name contactName phone")
      .populate(
        "relatedEvent",
        "eventNumber eventDate address startTime guestCount customerName status",
      );

    res.status(201).json(populatedOrder);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating order", error: error.message });
  }
};

// Update an existing order
exports.updateOrder = async (req, res) => {
  try {
    // Recalculate total if items are being updated
    let updateData = { ...req.body };
    if (updateData.items) {
      updateData.totalAmount = updateData.items.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0,
      );
    }
    if (updateData.relatedEvent) {
      const eventExists = await Event.findById(updateData.relatedEvent);
      if (!eventExists) {
        return res.status(400).json({ error: "Related event not found" });
      }
    }
    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(updatedOrder);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating order", error: error.message });
  }
};

exports.setPayment = async (req, res) => {
  try {
    const { TotalAmountPaid, autoCreateExpense, resetPayment } = req.body;
    const order = await PurchaseOrder.findById(req.params.id)
      .populate("supplier", "name contactName phone")
      .populate("items.product", "code label superCategory netPrice notes")
      .populate("relatedEvent", "eventNumber eventDate address startTime");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Reset payment — clear amount, delete related expense, revert status
    if (resetPayment) {
      if (order.relatedExpense) {
        await Expenses.findByIdAndDelete(order.relatedExpense);
        order.relatedExpense = null;
      }
      order.TotalAmountPaid = 0;
      order.isPaid = false;
      if (order.status === "COMPLETED") order.status = "SENT";
      await order.save();
      return res.status(200).json(order);
    }

    // Guard against overpayment
    const TotalPaidSoFar = order.TotalAmountPaid || 0;
    const remaining = order.ActualPrice - TotalPaidSoFar;
    if (TotalAmountPaid > remaining) {
      return res.status(400).json({
        message: `סכום התשלום (${TotalAmountPaid}) חורג מהיתרה לתשלום (${remaining})`,
      });
    }

    order.TotalAmountPaid = TotalPaidSoFar + TotalAmountPaid;
    // If the total amount paid meets or exceeds the total amount of the order, we can consider it fully paid and update the status to COMPLETED
    if (order.TotalAmountPaid >= order.ActualPrice) {
      order.status = "COMPLETED";
      order.isPaid = true;
    }
    await order.save();
    if (autoCreateExpense && TotalAmountPaid > 0) {
      if (order.orderType === "BUY") {
        try {
          await postOrderProcessing(order, order.TotalAmountPaid);
        } catch (error) {
          console.error("Error processing order after payment:", error);
        }
      } else if (order.orderType === "RETURN") {
        try {
          await postReturnProcessing(order, order.TotalAmountPaid);
        } catch (error) {
          console.error("Error processing return order after payment:", error);
        }
      }
    }
    res.status(200).json(order);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error setting payment", error: error.message });
  }
};

// Delete an order
exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    // If the deleted order has a related expense, we should also delete that to prevent orphan records
    if (deletedOrder.relatedExpense) {
      await Expenses.findByIdAndDelete(deletedOrder.relatedExpense);
    }
    res.status(200).json(deletedOrder);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error deleting order", error: error.message });
  }
};

// Update order status specifically (e.g., DRAFT to SENT)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, isPaid, autoCreateExpense } = req.body;

    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status, isPaid },
      { new: true },
    ).populate("supplier", "name contactName phone");

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating order status", error: error.message });
  }
};

// Add an item to an order | Can not be added to orders that are not in DRAFT status to prevent changes to sent or received orders - if needed, the order should be duplicated and edited as a new order
exports.addOrderItem = async (req, res) => {
  try {
    // check for existing order
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order || order.status !== "DRAFT") {
      return res
        .status(400)
        .json({ message: "Order not found or cannot be updated" });
    }
    // check for existing product
    const { product, quantity, notes } = req.body;
    const productDetails = await Products.findById(product);
    if (!productDetails) {
      return res.status(400).json({ message: "Product not found" });
    }

    // check if product already exists in the order — increase quantity instead of adding duplicate
    const existingItem = order.items.find(
      (item) => item.product?.toString() === product,
    );

    if (existingItem) {
      order.totalAmount -= existingItem.totalPrice;
      existingItem.quantity += quantity;
      existingItem.totalPrice =
        existingItem.pricePerUnitSnapshot * existingItem.quantity;
      order.totalAmount += existingItem.totalPrice;
      if (notes) existingItem.notes = notes;
    } else {
      // function logic
      const productNameSnapshot = productDetails.label;
      const pricePerUnitSnapshot = productDetails.netPrice;
      const totalPrice = pricePerUnitSnapshot * quantity;
      const newItem = {
        product,
        quantity,
        notes,
        totalPrice,
        productNameSnapshot,
        pricePerUnitSnapshot,
      };
      order.items.push(newItem);
      order.totalAmount += totalPrice;
    }

    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error adding item to order", error: error.message });
  }
};

// Remove an item from an order | Can not be removed from orders that are not in DRAFT status to prevent changes to sent or received orders - if needed, the order should be duplicated and edited as a new order
exports.removeOrderItem = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order || order.status !== "DRAFT") {
      return res
        .status(404)
        .json({ message: "Order not found or cannot be updated" });
    }
    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }
    order.totalAmount -= item.totalPrice;
    order.items.pull(req.params.itemId);
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({
      message: "Error removing item from order",
      error: error.message,
    });
  }
};

// Update an item's quantity in an order | Can not be updated in orders that are not in DRAFT status to prevent changes to sent or received orders - if needed, the order should be duplicated and edited as a new order
exports.updateOrderItem = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order || order.status !== "DRAFT") {
      return res
        .status(404)
        .json({ message: "Order not found or cannot be updated" });
    }
    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }
    const { quantity, notes } = req.body;
    if (quantity != null) {
      order.totalAmount -= item.totalPrice;
      item.quantity = quantity;
      item.totalPrice = item.pricePerUnitSnapshot * quantity;
      order.totalAmount += item.totalPrice;
    }
    if (notes != null) item.notes = notes;
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating item", error: error.message });
  }
};

// Remove related event association from an order
exports.removeRelatedEvent = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.relatedEvent = null;
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error removing related event", error: error.message });
  }
};

// Update actual price and sync to related expense
exports.updateActualPrice = async (req, res) => {
  try {
    const { ActualPrice } = req.body;
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.ActualPrice = ActualPrice;
    order.status = ActualPrice > 0 ? "SENT" : order.status; // if actual price is set to more than 0, we can assume the order has been sent to the supplier
    await order.save();
    console.log(order);
    res.status(200).json(order);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating actual price", error: error.message });
  }
};

exports.getOrdersRelatedToEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const orders = await PurchaseOrder.find({ relatedEvent: eventId })
      .populate("supplier", "name contactName phone")
      .populate("items.product", "code label superCategory netPrice notes")
      .populate(
        "relatedEvent",
        "eventNumber eventDate address startTime customerName status",
      )
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching related orders", error: error.message });
  }
};
