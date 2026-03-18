const PurchaseOrder = require('../models/PurchaseOrder');
const Event = require('../models/Events');
// Get all purchase orders
exports.getOrders = async (req, res) => {
  try {
    // Populate supplier details for the list view
    const orders = await PurchaseOrder.find()
      .populate('supplier', 'name contactName phone')
      .populate('items.product', 'code label superCategory netPrice notes')
      .populate('relatedEvent', 'eventNumber eventDate address')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

// Get a single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name contactName phone email')
      .populate('items.product', 'code label superCategory netPrice notes');
      
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};

// Create a new purchase order
exports.createOrder = async (req, res) => {
  try {
    // Calculate total amount from items if not provided or to ensure accuracy
    let calculatedTotal = 0;
    if (req.body.items && req.body.items.length > 0) {
      calculatedTotal = req.body.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }
    
    const orderData = {
      ...req.body,
      totalAmount: req.body.totalAmount || calculatedTotal
    };

    const newOrder = new PurchaseOrder(orderData);
    const savedOrder = await newOrder.save();
    
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', error: error.message });
  }
};

// Update an existing order
exports.updateOrder = async (req, res) => {
  try {
    // Recalculate total if items are being updated
    let updateData = { ...req.body };
    if (updateData.items) {
      updateData.totalAmount = updateData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
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
      { new: true, runValidators: true }
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error: error.message });
  }
};

// Update order status specifically (e.g., DRAFT to SENT)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, isPaid } = req.body;
    
    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status, isPaid },
      { new: true }
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order status', error: error.message });
  }
};