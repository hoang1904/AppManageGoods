import mongoose from 'mongoose';

// URI kết nối MongoDB — đọc từ .env, mặc định là localhost
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quan-ly-hang';

/**
 * Thử kết nối MongoDB.
 * Trả về true nếu thành công, false nếu không thể kết nối.
 * Không gọi process.exit(1) để server có thể kích hoạt fallback lưu trữ an toàn.
 */
export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2500, // Chỉ đợi tối đa 2.5s khi khởi động
    });
    console.log(`✅ [MongoDB] Kết nối thành công: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return true;
  } catch (err) {
    console.warn(`⚠️  [MongoDB] Không thể kết nối tới ${MONGODB_URI} (${err.message}).`);
    return false;
  }
};

// Lắng nghe sự kiện mất kết nối để log cảnh báo
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Mất kết nối. Mongoose sẽ tự reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB Error]', err.message);
});
