import mongoose from 'mongoose';

// ─── Schema cho lịch sử nhập/xuất kho ────────────────────────────────────
const inventoryHistorySchema = new mongoose.Schema(
  {
    // Liên kết đến sản phẩm (không dùng ObjectId ref vì khi xóa sản phẩm vẫn giữ lịch sử)
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    type: {
      type: String,
      enum: { values: ['in', 'out'], message: 'Loại giao dịch phải là "in" hoặc "out".' },
      required: true,
    },
    quantity: { type: Number, required: true, min: [1, 'Số lượng giao dịch phải lớn hơn 0.'] },
    // quantityDelta: âm nếu xuất, dương nếu nhập — tiện cho báo cáo sau này
    quantityDelta: { type: Number, required: true },
    notes: { type: String, default: '' },
    // Người thực hiện giao dịch
    performedBy: { type: String, default: '' },
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

inventoryHistorySchema.index({ productId: 1 });
inventoryHistorySchema.index({ createdAt: -1 }); // Lấy giao dịch mới nhất trước

export const InventoryHistory = mongoose.model('InventoryHistory', inventoryHistorySchema);
