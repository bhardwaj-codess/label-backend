const mongoose = require('mongoose');
const { Schema } = mongoose;

const historySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  customerAddress: String,
  lines: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    sku: String,
    qty: Number,
    unitsPerBox: Number,
    labelPrint: Number,
    brand: String
  }],
  status: {
    type: String,
    default: 'completed'
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('History', historySchema);