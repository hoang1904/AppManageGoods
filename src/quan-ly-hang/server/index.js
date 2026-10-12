import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockProducts } from '../src/data/mockData.js';
import { applyInventoryMovement } from '../src/data/inventoryUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'inventory-demo-secret';
const DATA_FILE = path.join(__dirname, 'data', 'app-data.json');

const demoUsers = [
  { id: 'u-admin', username: 'admin', password: 'admin123', role: 'admin', name: 'Quản trị viên' },
  { id: 'u-staff', username: 'staff', password: 'staff123', role: 'staff', name: 'Nhân viên kho' },
];

const defaultData = {
  products: mockProducts,
  categories: [...new Set(mockProducts.map((product) => product.category))].filter(Boolean).sort(),
  inventoryHistory: [],
};

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
  }
};

const readData = () => {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
};

const writeData = (data) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ.' });
  }
};

const canWriteProducts = (user) => user && user.role === 'admin';

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = demoUsers.find(
    (candidate) => candidate.username === username && candidate.password === password,
  );

  if (!user) {
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
  }

  const token = jwt.sign({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  }, JWT_SECRET, { expiresIn: '8h' });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    },
  });
});

app.get('/api/products', authMiddleware, (req, res) => {
  const data = readData();
  res.json(data.products || []);
});

app.post('/api/products', authMiddleware, (req, res) => {
  if (!canWriteProducts(req.user)) {
    return res.status(403).json({ message: 'Chỉ admin mới được thêm sản phẩm.' });
  }

  const data = readData();
  const payload = { ...req.body, id: globalThis.crypto?.randomUUID?.() || `p-${Date.now()}` };
  const duplicate = data.products.some((product) => String(product.code || '').trim().toLowerCase() === String(payload.code || '').trim().toLowerCase());

  if (duplicate) {
    return res.status(400).json({ message: 'Mã sản phẩm đã tồn tại.' });
  }

  data.products = [...data.products, payload];
  writeData(data);
  return res.status(201).json(payload);
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  if (!canWriteProducts(req.user)) {
    return res.status(403).json({ message: 'Chỉ admin mới được cập nhật sản phẩm.' });
  }

  const data = readData();
  const { id } = req.params;
  const payload = req.body;

  const duplicate = data.products.some(
    (product) =>
      String(product.id) !== String(id) &&
      String(product.code || '').trim().toLowerCase() === String(payload.code || '').trim().toLowerCase(),
  );

  if (duplicate) {
    return res.status(400).json({ message: 'Mã sản phẩm đã tồn tại.' });
  }

  data.products = data.products.map((product) => (
    String(product.id) === String(id) ? { ...product, ...payload, id: product.id } : product
  ));
  writeData(data);
  return res.json(data.products.find((product) => String(product.id) === String(id)));
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  if (!canWriteProducts(req.user)) {
    return res.status(403).json({ message: 'Chỉ admin mới được xóa sản phẩm.' });
  }

  const data = readData();
  data.products = data.products.filter((product) => String(product.id) !== String(req.params.id));
  writeData(data);
  return res.status(204).send();
});

app.get('/api/categories', authMiddleware, (req, res) => {
  const data = readData();
  res.json(data.categories || []);
});

app.post('/api/categories', authMiddleware, (req, res) => {
  if (!canWriteProducts(req.user)) {
    return res.status(403).json({ message: 'Chỉ admin mới được quản lý danh mục.' });
  }

  const data = readData();
  const name = String(req.body?.name || '').trim();
  if (!name) {
    return res.status(400).json({ message: 'Tên danh mục không được để trống.' });
  }

  if (data.categories.some((category) => category.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ message: 'Danh mục đã tồn tại.' });
  }

  data.categories = [...data.categories, name].sort((a, b) => a.localeCompare(b, 'vi'));
  writeData(data);
  return res.status(201).json({ name });
});

app.get('/api/inventory', authMiddleware, (req, res) => {
  const data = readData();
  res.json({ products: data.products, history: data.inventoryHistory || [] });
});

app.post('/api/inventory', authMiddleware, (req, res) => {
  const data = readData();
  const movement = req.body || {};
  const product = data.products.find((item) => String(item.id) === String(movement.productId));

  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  }

  try {
    const result = applyInventoryMovement(data.products, {
      productId: movement.productId,
      type: movement.type,
      quantity: movement.quantity,
      notes: movement.notes,
    });

    data.products = result.products;
    const entry = {
      ...result.history[0],
      productName: product.name,
    };
    data.inventoryHistory = [entry, ...(data.inventoryHistory || [])];
    writeData(data);
    return res.status(201).json({ products: data.products, history: data.inventoryHistory });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Không thể ghi nhận giao dịch.' });
  }
});

app.listen(port, () => {
  console.log(`API inventory running at http://localhost:${port}`);
});
