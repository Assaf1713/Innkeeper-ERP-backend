const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryProduct',
    required: true,
  },
  productNameSnapshot: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  pricePerUnitSnapshot: {
    type: Number,
    required: true,
    min: 0,
  },
  notes:{
    type: String,
    trim: true,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  }
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: Number,
      unique: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    orderType:{
      type:String,
      enum: ['BUY', 'RETURN', 'QUOTE'],
      default: 'BUY',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'RECEIVED', 'CANCELED', 'COMPLETED'],
      default: 'DRAFT',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ActualPrice : { // to compare actual amount paid to the caculated price from the items array
      type : Number,
      default : 0,
      min : 0 ,
    },
    TotalAmountPaid : {
      type : Number,
      default : 0,
      min : 0,
    },

    notes: {
      type: String,
      trim: true,
    },
    relatedEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
    },
    relatedExpense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
    invoicePdfUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);


purchaseOrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastOrder = await this.constructor.findOne({}, {}, { sort: { orderNumber: -1 } });
    this.orderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1000;
  }
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);