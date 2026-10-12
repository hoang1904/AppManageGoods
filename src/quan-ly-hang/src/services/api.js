const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('inventory-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  login: async (username, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Đăng nhập thất bại.');
    }

    return result;
  },
  getProducts: async () => {
    const response = await fetch(`${API_BASE}/products`, { headers: getAuthHeader() });
    if (!response.ok) throw new Error('Không thể tải dữ liệu sản phẩm.');
    return response.json();
  },
  getCategories: async () => {
    const response = await fetch(`${API_BASE}/categories`, { headers: getAuthHeader() });
    if (!response.ok) throw new Error('Không thể tải danh mục.');
    return response.json();
  },
  getInventoryHistory: async () => {
    const response = await fetch(`${API_BASE}/inventory`, { headers: getAuthHeader() });
    if (!response.ok) throw new Error('Không thể tải lịch sử kho.');
    return response.json();
  },
};
