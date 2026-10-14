/**
 * Script nạp dữ liệu mẫu vào MongoDB lần đầu tiên.
 * Chạy: npm run seed (hoặc node server/seed.js)
 * Chỉ chạy khi collection rỗng — an toàn để chạy nhiều lần.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import { Product } from './models/Product.js';

// Dữ liệu mẫu chuẩn hóa giá cả và tên sản phẩm thực tế
const sampleProducts = [
  { code: 'SP001', name: 'Sữa bột Cô Gái Hà Lan 900g', category: 'Sữa & Sản phẩm từ sữa', quantity: 87, buyPrice: 245000, sellPrice: 315000, unit: 'hộp', notes: 'Hàng bán chạy, hạn sử dụng 18 tháng' },
  { code: 'SP002', name: 'Sữa bột Meiji Mama Gold 960g', category: 'Mẹ & Bé', quantity: 0, buyPrice: 360000, sellPrice: 420000, unit: 'hộp', notes: 'Hết hàng, cần nhập thêm đợt tới' },
  { code: 'SP003', name: 'Bánh bông lan trứng muối sốt bơ', category: 'Thực phẩm', quantity: 150, buyPrice: 12000, sellPrice: 18000, unit: 'cái', notes: 'Hàng tươi trong ngày' },
  { code: 'SP004', name: 'Sữa tươi tiệt trùng Vinamilk 100% canxi 180ml', category: 'Sữa & Sản phẩm từ sữa', quantity: 380, buyPrice: 8000, sellPrice: 10500, unit: 'hộp', notes: 'Bán lẻ & lốc 4 hộp' },
  { code: 'SP005', name: 'Sữa tươi tiệt trùng không đường TH True Milk 1L', category: 'Sữa & Sản phẩm từ sữa', quantity: 120, buyPrice: 28000, sellPrice: 36000, unit: 'hộp', notes: 'Bán chạy vào dịp cuối tuần' },
  { code: 'SP006', name: 'Sữa Abbott Ensure Gold hương vani 850g', category: 'Sữa & Sản phẩm từ sữa', quantity: 46, buyPrice: 650000, sellPrice: 780000, unit: 'hộp', notes: 'Nhập khẩu chính hãng' },
  { code: 'SP007', name: 'Váy hoa nhí dáng xòe mùa hè', category: 'Thời trang', quantity: 28, buyPrice: 180000, sellPrice: 280000, unit: 'cái', notes: 'Size S, M, L' },
  { code: 'SP008', name: 'Túi đựng thực phẩm sinh học Zipper 500g', category: 'Thực phẩm', quantity: 560, buyPrice: 25000, sellPrice: 38000, unit: 'gói', notes: 'Bảo quản tốt, tự phân hủy' },
];

(async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('\n❌ Không thể kết nối MongoDB để seed dữ liệu.');
    console.error('💡 Vui lòng bật MongoDB Service hoặc cấu hình MONGODB_URI trong .env rồi thử lại.\n');
    process.exit(1);
  }

  const existingCount = await Product.countDocuments();
  if (existingCount > 0) {
    console.log(`ℹ️  MongoDB đã có ${existingCount} sản phẩm. Bỏ qua nạp lại.`);
    console.log('   (Nếu muốn nạp lại: xóa collection products trong database rồi chạy lại)');
  } else {
    await Product.insertMany(sampleProducts);
    console.log(`✅ Đã nạp thành công ${sampleProducts.length} sản phẩm mẫu vào MongoDB!`);
  }

  await mongoose.disconnect();
  console.log('👋 Đã đóng kết nối MongoDB an toàn.');
})();
