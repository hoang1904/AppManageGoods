import React from 'react';
import * as XLSX from 'xlsx';
import { Layout, Menu, message, Breadcrumb, Modal } from 'antd';
import {
  ShoppingOutlined,
  DashboardOutlined,
  TagsOutlined,
  LogoutOutlined,
  InboxOutlined,
  FileTextOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import ProductTable from './components/ProductTable';
import ProductForm from './components/ProductForm';
import CategoryManager from './components/CategoryManager';
import PricingTable from './components/PricingTable';
import InventoryManagement from './components/InventoryManagement';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import OrderManagement from './components/OrderManagement';
import ChangePasswordModal from './components/ChangePasswordModal';
import { api } from './services/api';
import './App.css';

const { Header, Sider, Content } = Layout;

// ─── Khởi tạo user từ localStorage (nếu có phiên cũ) ────────────────────
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('inventory-user') || 'null');
  } catch {
    return null;
  }
};

function App() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState('dashboard');

  // Dữ liệu đến từ API, không phải localStorage
  const [products, setProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [inventoryHistory, setInventoryHistory] = React.useState([]);

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [dataLoading, setDataLoading] = React.useState(false);

  const [sessionUser, setSessionUser] = React.useState(getStoredUser);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const isAdmin = sessionUser?.role === 'admin';

  // ── Lắng nghe sự kiện token hết hạn từ api.js ──────────────────────────
  React.useEffect(() => {
    const handleExpired = () => {
      Modal.warning({
        title: 'Phiên đăng nhập đã hết hạn',
        content: 'Vui lòng đăng nhập lại để tiếp tục.',
        onOk: () => {
          setSessionUser(null);
        },
      });
    };
    window.addEventListener('session:expired', handleExpired);
    return () => window.removeEventListener('session:expired', handleExpired);
  }, []);

  // ── Tải toàn bộ dữ liệu từ API khi đăng nhập ──────────────────────────
  const loadAllData = React.useCallback(async () => {
    setDataLoading(true);
    try {
      const [prods, cats, inventory] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getInventory(),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setInventoryHistory(inventory?.history || []);
    } catch (error) {
      message.error(error.message || 'Không thể tải dữ liệu từ máy chủ.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (sessionUser) {
      loadAllData();
    }
  }, [sessionUser, loadAllData]);

  // ── Đăng nhập / Đăng xuất ─────────────────────────────────────────────
  const handleLogin = (user, token) => {
    setSessionUser(user);
    localStorage.setItem('inventory-user', JSON.stringify(user));
    if (token) localStorage.setItem('inventory-token', token);
  };

  const handleLogout = () => {
    setSessionUser(null);
    localStorage.removeItem('inventory-user');
    localStorage.removeItem('inventory-token');
    setProducts([]);
    setCategories([]);
    setInventoryHistory([]);
  };

  // ── Sản phẩm ───────────────────────────────────────────────────────────
  const sanitizePayload = (values) => {
    const payload = { ...values };
    payload.code = String(payload.code || '').trim();
    payload.name = String(payload.name || '').trim();
    payload.category = String(payload.category || '').trim();
    payload.buyPrice = Number(payload.buyPrice || 0);
    payload.sellPrice = Number(payload.sellPrice || 0);
    payload.quantity = Number(payload.quantity || 0);
    delete payload.id;
    delete payload._id;
    return payload;
  };

  const handleAddProduct = async (values) => {
    setLoading(true);
    try {
      const created = await api.createProduct(sanitizePayload(values));
      setProducts((prev) => [...prev, created]);
      message.success('Thêm sản phẩm thành công!');
      setModalVisible(false);
      setSelectedProduct(null);
    } catch (error) {
      message.error(error.message || 'Lỗi khi thêm sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (values) => {
    setLoading(true);
    try {
      const { id } = values;
      const updated = await api.updateProduct(id, sanitizePayload(values));
      setProducts((prev) => prev.map((p) => String(p.id) === String(id) ? updated : p));
      message.success('Cập nhật sản phẩm thành công!');
      setModalVisible(false);
      setSelectedProduct(null);
    } catch (error) {
      message.error(error.message || 'Lỗi khi cập nhật sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    setLoading(true);
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      message.success('Xóa sản phẩm thành công!');
    } catch (error) {
      message.error(error.message || 'Lỗi khi xóa sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setModalVisible(true);
  };

  const handleFormSubmit = (values) => {
    if (selectedProduct?.id) {
      handleUpdateProduct({ ...selectedProduct, ...values, id: selectedProduct.id });
    } else {
      handleAddProduct(values);
    }
  };

  // ── Danh mục ───────────────────────────────────────────────────────────
  const handleAddCategory = async (name) => {
    try {
      const result = await api.createCategory(name);
      setCategories((prev) => [...prev, result.name].sort((a, b) => a.localeCompare(b, 'vi')));
      message.success('Thêm danh mục thành công!');
    } catch (error) {
      message.error(error.message || 'Không thể thêm danh mục.');
    }
  };

  const handleRenameCategory = async (oldName, newName) => {
    try {
      await api.renameCategory(oldName, newName.trim());
      // Cập nhật local state
      setCategories((prev) =>
        prev.map((c) => (c === oldName ? newName.trim() : c)).sort((a, b) => a.localeCompare(b, 'vi')),
      );
      setProducts((prev) =>
        prev.map((p) => p.category === oldName ? { ...p, category: newName.trim() } : p),
      );
      message.success('Đã cập nhật danh mục.');
    } catch (error) {
      message.error(error.message || 'Không thể đổi tên danh mục.');
    }
  };

  const handleDeleteCategory = async (name) => {
    try {
      await api.deleteCategory(name);
      setCategories((prev) => prev.filter((c) => c !== name));
      message.success('Đã xóa danh mục.');
    } catch (error) {
      // Server sẽ trả lỗi nếu danh mục còn sản phẩm
      message.error(error.message || 'Không thể xóa danh mục.');
    }
  };

  // ── Xuất / Nhập Excel ──────────────────────────────────────────────────
  const handleExportProducts = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      products.map((p) => ({
        code: p.code,
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        notes: p.notes || '',
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products.xlsx');
  };

  const handleImportTrigger = () => fileInputRef.current?.click();

  const handleImportProducts = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) { message.warning('File Excel không có dữ liệu.'); return; }

      // Lọc bỏ sản phẩm có mã đã tồn tại trong hệ thống
      const existingCodes = new Set(products.map((p) => p.code.trim().toLowerCase()));
      const newRows = rows
        .map((row) => ({
          code: String(row.code || '').trim(),
          name: String(row.name || '').trim(),
          category: String(row.category || '').trim(),
          quantity: Number(row.quantity || 0),
          buyPrice: Number(row.buyPrice || 0),
          sellPrice: Number(row.sellPrice || 0),
          unit: String(row.unit || 'cái').trim(),
          notes: String(row.notes || '').trim(),
        }))
        .filter((p) => p.code && p.name && !existingCodes.has(p.code.toLowerCase()));

      if (!newRows.length) {
        message.warning('Không có sản phẩm hợp lệ nào để nhập (kiểm tra trùng mã hoặc thiếu tên/mã).');
        return;
      }

      // Gọi API để tạo từng sản phẩm (server sẽ validate và gán id)
      setLoading(true);
      let successCount = 0;
      const errors = [];
      for (const row of newRows) {
        try {
          const created = await api.createProduct(row);
          setProducts((prev) => [...prev, created]);
          successCount++;
        } catch (err) {
          errors.push(`${row.code}: ${err.message}`);
        }
      }

      if (successCount > 0) message.success(`Đã nhập ${successCount} sản phẩm từ Excel.`);
      if (errors.length > 0) message.warning(`${errors.length} sản phẩm lỗi: ${errors.slice(0, 3).join('; ')}`);
    } catch (error) {
      message.error('Không thể đọc file Excel.');
      console.error(error);
    } finally {
      event.target.value = '';
      setLoading(false);
    }
  };

  // ── Nhập/Xuất kho ─────────────────────────────────────────────────────
  const handleMovement = async (movement) => {
    try {
      const result = await api.recordMovement(movement);
      setProducts(result.products);
      setInventoryHistory(result.history);
      message.success(movement.type === 'in' ? 'Nhập hàng thành công.' : 'Xuất hàng thành công.');
    } catch (error) {
      message.error(error.message || 'Không thể ghi nhận giao dịch.');
    }
  };

  // ── Menu ───────────────────────────────────────────────────────────────
  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: 'orders', icon: <FileTextOutlined />, label: 'Bán hàng / Đơn hàng' },
    {
      key: 'products',
      icon: <ShoppingOutlined />,
      label: 'Quản lý hàng',
      children: [
        { key: 'all-products', label: 'Tất cả hàng hóa' },
        { key: 'categories', label: 'Danh mục' },
      ],
    },
    { key: 'pricing', icon: <TagsOutlined />, label: 'Giá bán' },
    { key: 'inventory', icon: <InboxOutlined />, label: 'Tồn kho' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  if (!sessionUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} width={200} theme="light">
        <div style={{ padding: '16px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#1990ff' }}>
          {!collapsed && 'Quản Lý Hàng'}
        </div>
        <Menu
          mode="inline"
          items={menuItems}
          onClick={(e) => {
            if (e.key === 'all-products') setCurrentPage('products');
            else if (e.key === 'categories') setCurrentPage('categories');
            else if (e.key === 'orders') setCurrentPage('orders');
            else if (e.key === 'pricing') setCurrentPage('pricing');
            else if (e.key === 'inventory') setCurrentPage('inventory');
            else if (e.key === 'dashboard') setCurrentPage('dashboard');
            else if (e.key === 'logout') handleLogout();
          }}
          selectedKeys={[currentPage === 'products' ? 'all-products' : currentPage]}
          defaultOpenKeys={['products']}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Hệ thống quản lý kho hàng</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span>👤 {sessionUser.name || sessionUser.username}</span>
            <span style={{ fontSize: 12, color: '#888', background: '#f0f0f0', padding: '2px 8px', borderRadius: 10 }}>
              {isAdmin ? 'Admin' : 'Nhân viên'}
            </span>
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d9d9d9',
                background: '#fff',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
              }}
            >
              <KeyOutlined /> Đổi mật khẩu
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{ padding: '6px 12px', border: '1px solid #d9d9d9', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
            >
              Đăng xuất
            </button>
          </div>
        </Header>

        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: '8px' }}>
          <Breadcrumb
            items={[
              { title: 'Trang chủ' },
              ...(currentPage === 'products' || currentPage === 'categories' ? [{ title: 'Quản lý hàng' }] : []),
              {
                title: {
                  dashboard: 'Tổng quan',
                  orders: 'Bán hàng / Đơn hàng',
                  products: 'Tất cả hàng hóa',
                  categories: 'Danh mục',
                  pricing: 'Giá bán',
                  inventory: 'Tồn kho',
                }[currentPage] || 'Trang chủ',
              },
            ]}
            style={{ marginBottom: '24px' }}
          />

          {currentPage === 'dashboard' && (
            <Dashboard products={products} inventoryHistory={inventoryHistory} />
          )}

          {currentPage === 'products' && (
            <ProductTable
              products={products}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onAddNew={handleAddNew}
              onExport={handleExportProducts}
              onImport={handleImportTrigger}
              loading={loading || dataLoading}
              canManage={isAdmin}
            />
          )}

          {currentPage === 'categories' && (
            <CategoryManager
              categories={categories}
              products={products}
              onAdd={handleAddCategory}
              onRename={handleRenameCategory}
              onDelete={handleDeleteCategory}
            />
          )}

          {currentPage === 'orders' && (
            <OrderManagement
              products={products}
              onOrderCompleted={(res) => {
                if (res?.products) setProducts(res.products);
                if (res?.history) setInventoryHistory(res.history);
              }}
            />
          )}

          {currentPage === 'pricing' && (
            <PricingTable products={products} onEdit={handleEditProduct} />
          )}

          {currentPage === 'inventory' && (
            <InventoryManagement
              products={products}
              inventoryHistory={inventoryHistory}
              onMovement={handleMovement}
            />
          )}
        </Content>
      </Layout>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImportProducts} />

      <ProductForm
        visible={modalVisible}
        product={selectedProduct}
        categories={categories}
        onCancel={() => {
          setModalVisible(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleFormSubmit}
        loading={loading}
      />

      <ChangePasswordModal
        open={isChangePasswordOpen}
        onCancel={() => setIsChangePasswordOpen(false)}
      />
    </Layout>
  );
}

export default App;
