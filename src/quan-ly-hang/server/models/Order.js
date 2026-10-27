import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    productCode: { type: String, default: '' },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: [1, 'Số lượng tối thiểu là 1.'] },
    unit: { type: String, default: 'cái' },
    unitPrice: { type: Number, required: true, min: [0, 'Đơn giá không được âm.'] },
    subtotal: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      default: 'Khách lẻ',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    items: [orderItemSchema],
    totalQuantity: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    performedBy: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        ret.createdAt = ret.createdAt?.toISOString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

orderSchema.index({ orderCode: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
