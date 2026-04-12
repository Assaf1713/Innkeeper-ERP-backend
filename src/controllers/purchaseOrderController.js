const PurchaseOrder = require("../models/PurchaseOrder");
const Event = require("../models/Events");
const Products = require("../models/InventoryProduct");
const Expenses = require("../models/Expenses");

// util function to process order after it's marked as SENT - create expense record and (in the future) update inventory quantities 
const postOrderProcessing = async (order) =>  {
  try {
    const expenseData = {
      name: "מלאי",
      supplier: order.supplier?.name || null,
      category: "INVENTORY",
      date: order.orderDate || new Date(),
      price: order.totalAmount,
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
}
// util function to process return orders after they're marked as SENT - create negative expense record and (in the future) update inventory quantities
const postReturnProcessing = async (order) => {
  try {
    const expenseData = {
      name: "החזרת מלאי",
      supplier: order.supplier?.name || null,
      category: "INVENTORY",
      date: order.orderDate || new Date(),
      price: -Math.abs(order.totalAmount), // negative value to reflect return
      notes: `החזרת מלאי - הזמנה #${order.orderNumber}`,
    };
    const expenseRecord = new Expenses(expenseData);
    await expenseRecord.save();
    order.relatedExpense = expenseRecord._id;
    await order.save();
    console.log("Expense record created for return order:", order._id);
  }
  catch (error) {
    console.error("Error creating expense record for return order:", error);
  }
}
// Get all purchase orders
exports.getOrders = async (req, res) => {
  try {
    // Populate supplier details for the list view
    const orders = await PurchaseOrder.find()
      .populate("supplier", "name contactName phone")
      .populate("items.product", "code label superCategory netPrice notes")
      .populate("relatedEvent", "eventNumber eventDate address StartTime")
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
      .populate("items.product", "code label superCategory netPrice notes");

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
      .populate("relatedEvent", "eventNumber eventDate address StartTime");

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

// Delete an order
exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
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
    const { status, isPaid } = req.body;

    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status, isPaid },
      { new: true },
    ).populate("supplier", "name contactName phone");

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (status === "SENT") {
      if (updatedOrder.orderType === "BUY") {
        try {
          await postOrderProcessing(updatedOrder);
        } catch (error) {
          console.error("Error processing order:", error);
        }
      } else if (updatedOrder.orderType === "RETURN") {
        try {
          await postReturnProcessing(updatedOrder);
        } catch (error) {
          console.error("Error processing return order:", error);
        }
      }
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
      return res.status(400).json({ message: "Order not found or cannot be updated" });
    }
    // check for existing product
    const { product, quantity, notes } = req.body;
    const productDetails = await Products.findById(product);
    if (!productDetails) {
      return res.status(400).json({ message: "Product not found" });
    }
    // function logic
    const productNameSnapshot = productDetails.label; // capture product name at time of order
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
      return res.status(404).json({ message: "Order not found or cannot be updated" });
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
    res
      .status(400)
      .json({ message: "Error removing item from order", error: error.message });
  }
};

// Update an item's quantity in an order | Can not be updated in orders that are not in DRAFT status to prevent changes to sent or received orders - if needed, the order should be duplicated and edited as a new order
exports.updateOrderItem = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order || order.status !== "DRAFT") {
      return res.status(404).json({ message: "Order not found or cannot be updated" });
    }
    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }
    const { quantity } = req.body;
    order.totalAmount -= item.totalPrice;
    item.quantity = quantity;
    item.totalPrice = item.pricePerUnitSnapshot * quantity;
    order.totalAmount += item.totalPrice;
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
    res.status(400).json({ message: "Error removing related event", error: error.message });
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
    await order.save();
    if (order.relatedExpense) {
      const expensePrice = order.orderType === "RETURN" ? -Math.abs(ActualPrice) : ActualPrice;
      await Expenses.findByIdAndUpdate(order.relatedExpense, { price: expensePrice });
    }
    res.status(200).json(order);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating actual price", error: error.message });
  }
};

