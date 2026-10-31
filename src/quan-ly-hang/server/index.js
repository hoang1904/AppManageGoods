import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDB } from './db.js';
import { Product } from './models/Product.js';
import { InventoryHistory } from './models/InventoryHistory.js';
import { User } from './models/User.js';
import { Order } from './models/Order.js';

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

// ─── Kiểm tra bắt buộc khi khởi động ──────────────────────────────────────
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    '[FATAL] Biến môi trường JWT_SECRET bị thiếu hoặc quá ngắn (tối thiểu 32 ký tự).\n' +
    'Hãy đặt JWT_SECRET trong file .env trước khi chạy server.',
  );
  process.exit(1);
}

// ─── CORS: chỉ cho phép domain được cấu hình ──────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin không được phép: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiting cho endpoint login ─────────────────────────────────────
const loginAttempts = new Map();
const RATE_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 }; // 15 phút

const checkRateLimit = (ip) => {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return true;
  }

  if (record.count >= RATE_LIMIT.maxAttempts) {
    return false;
  }

  record.count += 1;
  return true;
};

// Dọn dẹp map rate-limit định kỳ
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now > record.resetAt) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

// ─── Tài khoản mặc định hệ thống (hash bằng bcrypt) ───────────────────────
const defaultUsers = [
  {
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 12),
    role: 'admin',
    name: 'Quản trị viên',
    isActive: true,
  },
  {
    username: 'staff',
    passwordHash: bcrypt.hashSync('staff123', 12),
    role: 'staff',
    name: 'Nhân viên kho',
    isActive: true,
  },
];

// ─── Middleware xác thực ───────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này (yêu cầu quyền Admin).' });
  }
  return next();
};

// ─── Routes ───────────────────────────────────────────────────────────────

app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  storage: 'mongodb',
  time: new Date().toISOString(),
}));

// Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ message: 'Quá nhiều lần thử đăng nhập. Vui lòng đợi 15 phút.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
  }

  try {
    const cleanUsername = String(username).toLowerCase().trim();
    const user = await User.findOne({ username: cleanUsername, isActive: true });

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
    }

    const userId = user._id ? user._id.toString() : user.id;
    const token = jwt.sign(
      { id: userId, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    return res.json({
      token,
      user: { id: userId, username: user.username, role: user.role, name: user.name },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Lỗi khi đăng nhập.' });
  }
});

// Đổi mật khẩu
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác.' });
    }
    user.passwordHash = bcrypt.hashSync(newPassword, 12);
    await user.save();
    return res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Không thể đổi mật khẩu.' });
  }
});

// ─── Sản phẩm ─────────────────────────────────────────────────────────────

app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const products = await Product.find(filter).sort({ code: 1 });
    return res.json(products);
  } catch {
    return res.status(500).json({ message: 'Không thể tải danh sách sản phẩm.' });
  }
});

app.post('/api/products', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    return res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã sản phẩm đã tồn tại.' });
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join('; ');
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: 'Không thể thêm sản phẩm.' });
  }
});

app.put('/api/products/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    delete body.id;
    delete body._id;

    const updated = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    return res.json(updated);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã sản phẩm đã tồn tại.' });
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join('; ');
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: 'Không thể cập nhật sản phẩm.' });
  }
});

app.delete('/api/products/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Không thể xóa sản phẩm.' });
  }
});

// ─── Danh mục ─────────────────────────────────────────────────────────────

app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const distinct = await Product.distinct('category');
    const categories = distinct.filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
    return res.json(categories);
  } catch {
    return res.status(500).json({ message: 'Không thể tải danh mục.' });
  }
});

app.post('/api/categories', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Tên danh mục không được để trống.' });

    const exists = await Product.findOne({ category: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (exists) return res.status(400).json({ message: 'Danh mục đã tồn tại.' });
    return res.status(201).json({ name });
  } catch {
    return res.status(500).json({ message: 'Không thể thêm danh mục.' });
  }
});

app.put('/api/categories/:name', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.name);
    const newName = String(req.body?.name || '').trim();
    if (!newName) return res.status(400).json({ message: 'Tên danh mục mới không được để trống.' });

    const result = await Product.updateMany(
      { category: oldName },
      { $set: { category: newName } },
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Danh mục không tồn tại hoặc không có sản phẩm.' });
    }
    return res.json({ name: newName, updatedProducts: result.modifiedCount });
  } catch {
    return res.status(500).json({ message: 'Không thể đổi tên danh mục.' });
  }
});

app.delete('/api/categories/:name', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const count = await Product.countDocuments({ category: name });
    if (count > 0) {
      return res.status(400).json({
        message: `Danh mục "${name}" đang có ${count} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.`,
      });
    }
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Không thể xóa danh mục.' });
  }
});

// ─── Kho hàng ─────────────────────────────────────────────────────────────

app.get('/api/inventory', authMiddleware, async (req, res) => {
  try {
    const [products, history] = await Promise.all([
      Product.find().sort({ code: 1 }),
      InventoryHistory.find().sort({ createdAt: -1 }).limit(200),
    ]);
    return res.json({ products, history });
  } catch {
    return res.status(500).json({ message: 'Không thể tải dữ liệu kho hàng.' });
  }
});

app.post('/api/inventory', authMiddleware, async (req, res) => {
  const { productId, type, quantity, notes } = req.body || {};

  if (!productId) return res.status(400).json({ message: 'Thiếu thông tin sản phẩm.' });
  if (!['in', 'out'].includes(type)) return res.status(400).json({ message: 'Loại giao dịch không hợp lệ.' });

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Số lượng giao dịch phải là số dương.' });
  }

  const session = await Product.startSession();
  try {
    await session.withTransaction(async () => {
      const product = await Product.findById(productId).session(session);
      if (!product) throw Object.assign(new Error('Không tìm thấy sản phẩm.'), { status: 404 });

      const currentQty = product.quantity;
      const nextQty = type === 'in' ? currentQty + qty : currentQty - qty;

      if (type === 'out' && nextQty < 0) {
        throw Object.assign(
          new Error(`"${product.name}" không đủ hàng để xuất (tồn kho: ${currentQty}).`),
          { status: 400 },
        );
      }

      await Product.findByIdAndUpdate(
        productId,
        { $set: { quantity: nextQty } },
        { new: true, session },
      );

      await InventoryHistory.create(
        [{
          productId: String(productId),
          productName: product.name,
          type,
          quantity: qty,
          quantityDelta: type === 'in' ? qty : -qty,
          notes: notes || '',
          performedBy: req.user?.name || req.user?.username || '',
        }],
        { session },
      );
    });

    const [products, history] = await Promise.all([
      Product.find().sort({ code: 1 }),
      InventoryHistory.find().sort({ createdAt: -1 }).limit(200),
    ]);

    return res.status(201).json({ products, history });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Không thể ghi nhận giao dịch.' });
  } finally {
    await session.endSession();
  }
});

// ─── Đơn hàng / Bán hàng xuất kho nhiều món ───────────────────────────────

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100);
    return res.json(orders);
  } catch {
    return res.status(500).json({ message: 'Không thể tải danh sách đơn hàng.' });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  const { customerName, customerPhone, items, notes } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Đơn hàng phải có ít nhất 1 sản phẩm.' });
  }

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: `Số lượng cho "${item.productName || item.productId}" phải lớn hơn 0.` });
    }
  }

  const orderCode = `HD${Date.now().toString().slice(-7)}`;
  const performedBy = req.user?.name || req.user?.username || '';

  const session = await Product.startSession();
  try {
    let createdOrder;
    await session.withTransaction(async () => {
      const orderItems = [];
      let totalQuantity = 0;
      let totalAmount = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw Object.assign(new Error(`Sản phẩm "${item.productName || item.productId}" không tồn tại.`), { status: 404 });
        }

        const qty = Number(item.quantity);
        if (product.quantity < qty) {
          throw Object.assign(
            new Error(`"${product.name}" chỉ còn ${product.quantity} ${product.unit || 'cái'} trong kho, không đủ bán ${qty}.`),
            { status: 400 },
          );
        }

        const unitPrice = Number(item.unitPrice ?? product.sellPrice ?? 0);
        const subtotal = qty * unitPrice;
        totalQuantity += qty;
        totalAmount += subtotal;

        // Trừ kho
        product.quantity -= qty;
        await product.save({ session });

        orderItems.push({
          productId: String(product._id),
          productCode: product.code || '',
          productName: product.name,
          quantity: qty,
          unit: product.unit || 'cái',
          unitPrice,
          subtotal,
        });

        // Ghi nhận lịch sử kho
        await InventoryHistory.create(
          [{
            productId: String(product._id),
            productName: product.name,
            type: 'out',
            quantity: qty,
            quantityDelta: -qty,
            notes: `Bán hàng đơn ${orderCode}${customerName ? ' - ' + customerName : ''}`,
            performedBy,
          }],
          { session },
        );
      }

      const [order] = await Order.create(
        [{
          orderCode,
          customerName: customerName || 'Khách lẻ',
          customerPhone: customerPhone || '',
          items: orderItems,
          totalQuantity,
          totalAmount,
          notes: notes || '',
          performedBy,
        }],
        { session },
      );
      createdOrder = order;
    });

    const [products, history] = await Promise.all([
      Product.find().sort({ code: 1 }),
      InventoryHistory.find().sort({ createdAt: -1 }).limit(200),
    ]);

    return res.status(201).json({ order: createdOrder, products, history });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Không thể tạo đơn hàng.' });
  } finally {
    await session.endSession();
  }
});

// ─── Xử lý lỗi toàn cục ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
});

// ─── Khởi động Server (Chỉ chạy khi MongoDB kết nối thành công) ───────────
const startServer = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('\n❌ [FATAL] Không thể kết nối tới MongoDB Database.');
    console.error('💡 Vui lòng kiểm tra MONGODB_URI trong file .env và thử lại.\n');
    process.exit(1);
  }

  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.insertMany(defaultUsers);
      console.log('👤 [MongoDB] Đã khởi tạo 2 tài khoản mặc định (admin / staff).');
    }
  } catch (e) {
    console.warn('⚠️ [MongoDB] Không thể kiểm tra tài khoản ban đầu:', e.message);
  }

  app.listen(port, () => {
    console.log(`\n=============================================================`);
    console.log(`🚀 API Inventory Backend đang chạy tại http://localhost:${port}`);
    console.log(`🍃 Chế độ lưu trữ: 100% MONGODB DATABASE (Atlas Cloud)`);
    console.log(`🔐 Bảo mật: Rate-Limiting + JWT (8h) + BCrypt (salt: 12)`);
    console.log(`🌐 Origins được phép: ${allowedOrigins.join(', ')}`);
    console.log(`=============================================================\n`);
  });
};

startServer();
