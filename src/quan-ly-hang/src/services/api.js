// ─────────────────────────────────────────────────────────────────────────────
// Lớp giao tiếp với API backend.
// Tất cả thao tác dữ liệu trong ứng dụng phải đi qua file này,
// KHÔNG đọc/ghi localStorage trực tiếp trong các component.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// Lấy Authorization header từ token đang lưu
const getAuthHeader = () => {
  const token = localStorage.getItem('inventory-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Hàm gốc gọi fetch, xử lý lỗi tập trung
const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {}),
    },
  });

  // Token hết hạn → xóa session, báo lỗi rõ ràng để App.jsx đưa về màn hình đăng nhập
  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED') {
      localStorage.removeItem('inventory-token');
      localStorage.removeItem('inventory-user');
      window.dispatchEvent(new CustomEvent('session:expired'));
    }
    throw new Error(body.message || 'Phiên đăng nhập không hợp lệ.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Lỗi ${response.status}`);
  }

  // 204 No Content không có body
  if (response.status === 204) return null;

  return response.json();
};

export const api = {
  // ── Xác thực ──────────────────────────────────────────────────────────────
  login: async (username, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Đăng nhập thất bại.');
    return result;
  },

  // ── Sản phẩm ──────────────────────────────────────────────────────────────
  getProducts: () => request('/products'),

  createProduct: (data) =>
    request('/products', { method: 'POST', body: JSON.stringify(data) }),

  updateProduct: (id, data) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteProduct: (id) =>
    request(`/products/${id}`, { method: 'DELETE' }),

  // ── Danh mục ──────────────────────────────────────────────────────────────
  getCategories: () => request('/categories'),

  createCategory: (name) =>
    request('/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  renameCategory: (oldName, newName) =>
    request(`/categories/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName }),
    }),

  deleteCategory: (name) =>
    request(`/categories/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  // ── Kho hàng ──────────────────────────────────────────────────────────────
  getInventory: () => request('/inventory'),

  recordMovement: (movement) =>
    request('/inventory', { method: 'POST', body: JSON.stringify(movement) }),
};
