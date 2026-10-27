import mongoose from 'mongoose';

/**
 * Thử kết nối MongoDB.
 * Trả về true nếu thành công, false nếu không thể kết nối.
 * Không gọi process.exit(1) để server có thể kích hoạt fallback lưu trữ an toàn.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quan-ly-hang';
  // Ẩn mật khẩu khi log để bảo mật
  const safeUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log(`🔌 [MongoDB] Đang kết nối tới: ${safeUri}`);

  try {
    await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 7000, // Tăng lên 7s cho kết nối MongoDB Atlas (cloud)
    });
    console.log(`✅ [MongoDB] Kết nối thành công: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return true;
  } catch (err) {
    console.warn(`⚠️  [MongoDB] Không thể kết nối tới ${safeUri} (${err.message}).`);
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
