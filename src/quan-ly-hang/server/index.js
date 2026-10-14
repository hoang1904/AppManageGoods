import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './db.js';
import { Product } from './models/Product.js';
import { InventoryHistory } from './models/InventoryHistory.js';
import { applyInventoryMovement } from '../src/data/inventoryUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'app-data.json');

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

// ─── Kiểm tra bắt buộc khi khởi động ──────────────────────────────────────
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    '[FATAL] Biến môi trường JWT_SECRET bị thiếu hoặc quá ngắn (tối thiểu 32 ký tự).\n' +
    'Hãy tạo file .env từ .env.example và đặt JWT_SECRET trước khi chạy server.',
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
app.use(express.json());

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

// ─── Tài khoản hệ thống (hash bằng bcrypt) ────────────────────────────────
const systemUsers = [
  {
    id: 'u-admin',
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 12),
    role: 'admin',
    name: 'Quản trị viên',
  },
  {
    id: 'u-staff',
    username: 'staff',
    passwordHash: bcrypt.hashSync('staff123', 12),
    role: 'staff',
    name: 'Nhân viên kho',
  },
];

// ─── Middleware xác thực ───────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({ message: 'Token không hợp lệ.', code: 'TOKEN_INVALID' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền thực hiện thao tác này.' });
  }
  return next();
};

// ─── Bộ lưu trữ cục bộ dự phòng (Local JSON Fallback) ─────────────────────
let isMongoConnected = false;

const readLocalData = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { products: [], categories: [], inventoryHistory: [] };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Storage] Lỗi đọc app-data.json:', err.message);
    return { products: [], categories: [], inventoryHistory: [] };
  }
};

const writeLocalData = (data) => {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('[Storage] Lỗi ghi app-data.json:', err.message);
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────

app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  storage: isMongoConnected ? 'mongodb' : 'local-json',
  time: new Date().toISOString(),
}));

// Đăng nhập
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ message: 'Quá nhiều lần thử đăng nhập. Vui lòng đợi 15 phút.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
  }

  const user = systemUsers.find((u) => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' },
  );

  return res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name },
  });
});

// ─── Sản phẩm ─────────────────────────────────────────────────────────────

app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    if (isMongoConnected) {
      const filter = {};
      if (req.query.category) filter.category = req.query.category;
      const products = await Product.find(filter).sort({ code: 1 });
      return res.json(products);
    }

    const data = readLocalData();
    let list = data.products || [];
    if (req.query.category) {
      list = list.filter((p) => p.category === req.query.category);
    }
    return res.json(list);
  } catch {
    return res.status(500).json({ message: 'Không thể tải danh sách sản phẩm.' });
  }
});

app.post('/api/products', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (isMongoConnected) {
      const product = await Product.create(req.body);
      return res.status(201).json(product);
    }

    const data = readLocalData();
    const { code, name, category, quantity, buyPrice, sellPrice, unit, notes } = req.body || {};
    const trimmedCode = String(code || '').trim();
    const trimmedName = String(name || '').trim();

    if (!trimmedCode) return res.status(400).json({ message: 'Mã sản phẩm không được để trống.' });
    if (!trimmedName) return res.status(400).json({ message: 'Tên sản phẩm không được để trống.' });

    if (data.products.some((p) => String(p.code).trim().toLowerCase() === trimmedCode.toLowerCase())) {
      return res.status(400).json({ message: 'Mã sản phẩm đã tồn tại.' });
    }

    const newProduct = {
      id: data.products.length ? Math.max(...data.products.map((p) => Number(p.id) || 0)) + 1 : 1,
      code: trimmedCode,
      name: trimmedName,
      category: String(category || '').trim(),
      quantity: Math.max(0, Number(quantity) || 0),
      buyPrice: Math.max(0, Number(buyPrice) || 0),
      sellPrice: Math.max(0, Number(sellPrice) || 0),
      unit: String(unit || 'cái').trim(),
      notes: String(notes || '').trim(),
    };

    data.products.push(newProduct);
    if (newProduct.category && !(data.categories || []).includes(newProduct.category)) {
      data.categories = [...(data.categories || []), newProduct.category];
    }
    writeLocalData(data);
    return res.status(201).json(newProduct);
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

    if (isMongoConnected) {
      const body = { ...req.body };
      delete body.id;
      delete body._id;

      const updated = await Product.findByIdAndUpdate(id, body, {
        new: true,
        runValidators: true,
      });

      if (!updated) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
      return res.json(updated);
    }

    const data = readLocalData();
    const index = data.products.findIndex((p) => String(p.id) === String(id));
    if (index === -1) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

    const newCode = String(req.body.code || '').trim();
    if (newCode) {
      const duplicate = data.products.find(
        (p) => String(p.id) !== String(id) && String(p.code).trim().toLowerCase() === newCode.toLowerCase(),
      );
      if (duplicate) return res.status(400).json({ message: 'Mã sản phẩm đã tồn tại.' });
    }

    data.products[index] = {
      ...data.products[index],
      ...req.body,
      id: data.products[index].id,
    };
    writeLocalData(data);
    return res.json(data.products[index]);
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
    if (isMongoConnected) {
      const deleted = await Product.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
      return res.status(204).send();
    }

    const data = readLocalData();
    const beforeCount = data.products.length;
    data.products = data.products.filter((p) => String(p.id) !== String(req.params.id));
    if (data.products.length === beforeCount) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }
    writeLocalData(data);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Không thể xóa sản phẩm.' });
  }
});

// ─── Danh mục ─────────────────────────────────────────────────────────────

app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    if (isMongoConnected) {
      const distinct = await Product.distinct('category');
      const categories = distinct.filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
      return res.json(categories);
    }

    const data = readLocalData();
    const catSet = new Set([
      ...(data.categories || []),
      ...(data.products || []).map((p) => p.category).filter(Boolean),
    ]);
    return res.json(Array.from(catSet).sort((a, b) => a.localeCompare(b, 'vi')));
  } catch {
    return res.status(500).json({ message: 'Không thể tải danh mục.' });
  }
});

app.post('/api/categories', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Tên danh mục không được để trống.' });

    if (isMongoConnected) {
      const exists = await Product.findOne({ category: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (exists) return res.status(400).json({ message: 'Danh mục đã tồn tại.' });
      return res.status(201).json({ name });
    }

    const data = readLocalData();
    if ((data.categories || []).some((c) => c.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ message: 'Danh mục đã tồn tại.' });
    }

    data.categories = [...(data.categories || []), name].sort((a, b) => a.localeCompare(b, 'vi'));
    writeLocalData(data);
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

    if (isMongoConnected) {
      const result = await Product.updateMany(
        { category: oldName },
        { $set: { category: newName } },
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Danh mục không tồn tại hoặc không có sản phẩm.' });
      }
      return res.json({ name: newName, updatedProducts: result.modifiedCount });
    }

    const data = readLocalData();
    data.categories = (data.categories || []).map((c) => (c === oldName ? newName : c));
    let modifiedCount = 0;
    data.products = (data.products || []).map((p) => {
      if (p.category === oldName) {
        modifiedCount += 1;
        return { ...p, category: newName };
      }
      return p;
    });

    writeLocalData(data);
    return res.json({ name: newName, updatedProducts: modifiedCount });
  } catch {
    return res.status(500).json({ message: 'Không thể đổi tên danh mục.' });
  }
});

app.delete('/api/categories/:name', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);

    if (isMongoConnected) {
      const count = await Product.countDocuments({ category: name });
      if (count > 0) {
        return res.status(400).json({
          message: `Danh mục "${name}" đang có ${count} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.`,
        });
      }
      return res.status(204).send();
    }

    const data = readLocalData();
    const count = (data.products || []).filter((p) => p.category === name).length;
    if (count > 0) {
      return res.status(400).json({
        message: `Danh mục "${name}" đang có ${count} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.`,
      });
    }

    data.categories = (data.categories || []).filter((c) => c !== name);
    writeLocalData(data);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Không thể xóa danh mục.' });
  }
});

// ─── Kho hàng ─────────────────────────────────────────────────────────────

app.get('/api/inventory', authMiddleware, async (req, res) => {
  try {
    if (isMongoConnected) {
      const [products, history] = await Promise.all([
        Product.find().sort({ code: 1 }),
        InventoryHistory.find().sort({ createdAt: -1 }).limit(200),
      ]);
      return res.json({ products, history });
    }

    const data = readLocalData();
    return res.json({
      products: data.products || [],
      history: data.inventoryHistory || [],
    });
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

  // Chế độ MongoDB: Sử dụng Transaction ACID
  if (isMongoConnected) {
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
  }

  // Chế độ Local JSON dự phòng
  try {
    const data = readLocalData();
    const product = (data.products || []).find((item) => String(item.id) === String(productId));
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

    const result = applyInventoryMovement(data.products, {
      productId,
      type,
      quantity: qty,
      notes,
    });

    data.products = result.products;
    const entry = {
      ...result.history[0],
      productName: product.name,
      performedBy: req.user?.name || req.user?.username || '',
    };
    data.inventoryHistory = [entry, ...(data.inventoryHistory || [])].slice(0, 200);
    writeLocalData(data);
    return res.status(201).json({ products: data.products, history: data.inventoryHistory });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Không thể ghi nhận giao dịch.' });
  }
});

// ─── Xử lý lỗi toàn cục ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
});

// ─── Khởi động Server ─────────────────────────────────────────────────────
connectDB().then((connected) => {
  isMongoConnected = connected;
  app.listen(port, () => {
    console.log(`\n=============================================================`);
    console.log(`🚀 API Inventory Backend đang chạy tại http://localhost:${port}`);
    if (isMongoConnected) {
      console.log(`🍃 Chế độ lưu trữ: MONGODB DATABASE (ACID Transaction)`);
    } else {
      console.log(`📁 Chế độ lưu trữ: LOCAL JSON BACKUP (server/data/app-data.json)`);
      console.log(`💡 Mẹo: Máy hiện chưa bật MongoDB service. Server tự kích hoạt`);
      console.log(`   chế độ Local JSON dự phòng an toàn để app chạy mượt mà 100%!`);
      console.log(`   Khi cần dùng MongoDB: bật mongod hoặc dán MONGODB_URI vào .env`);
    }
    console.log(`🔐 Bảo mật: Rate-Limiting + JWT (8h) + BCrypt (salt: 12)`);
    console.log(`🌐 Origins được phép: ${allowedOrigins.join(', ')}`);
    console.log(`=============================================================\n`);
  });
});
