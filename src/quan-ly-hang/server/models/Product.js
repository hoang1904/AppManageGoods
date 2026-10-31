import mongoose from 'mongoose';

// ─── Schema cho sản phẩm ─────────────────────────────────────────────────
// Mongoose sẽ validate dữ liệu trước khi ghi vào database
const productSchema = new mongoose.Schema(
  {
    // Mã sản phẩm: bắt buộc, unique, tự trim khoảng trắng
    code: {
      type: String,
      required: [true, 'Mã sản phẩm không được để trống.'],
      trim: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Tên sản phẩm không được để trống.'],
      trim: true,
    },
    category: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 0, min: [0, 'Số lượng không được âm.'] },
    unit: { type: String, trim: true, default: 'cái' },
    buyPrice: { type: Number, default: 0, min: [0, 'Giá mua không được âm.'] },
    sellPrice: { type: Number, default: 0, min: [0, 'Giá bán không được âm.'] },
    imageUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true, // Tự thêm createdAt và updatedAt
    toJSON: {
      // Khi chuyển sang JSON, đổi _id thành id để frontend không cần biết MongoDB dùng _id
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Index để tìm kiếm theo danh mục nhanh hơn
productSchema.index({ category: 1 });

export const Product = mongoose.model('Product', productSchema);
