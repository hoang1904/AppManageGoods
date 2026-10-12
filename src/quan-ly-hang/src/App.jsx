import React from 'react';
import * as XLSX from 'xlsx';
import { Layout, Menu, message, Breadcrumb } from 'antd';
import {
  ShoppingOutlined,
  DashboardOutlined,
  TagsOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import ProductTable from './components/ProductTable';
import ProductForm from './components/ProductForm';
import CategoryManager from './components/CategoryManager';
import PricingTable from './components/PricingTable';
import InventoryManagement from './components/InventoryManagement';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import { mockProducts } from './data/mockData';
import { applyInventoryMovement } from './data/inventoryUtils';
import './App.css';

const { Header, Sider, Content } = Layout;
const PRODUCTS_STORAGE_KEY = 'quan-ly-hang-products';
const CATEGORIES_STORAGE_KEY = 'quan-ly-hang-categories';
const INVENTORY_HISTORY_STORAGE_KEY = 'quan-ly-hang-inventory-history';

function App() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState('dashboard');
  const [products, setProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [inventoryHistory, setInventoryHistory] = React.useState([]);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [sessionUser, setSessionUser] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('inventory-user') || 'null');
    } catch {
      return null;
    }
  });
  const fileInputRef = React.useRef(null);

  const isAdmin = sessionUser?.role === 'admin';

  React.useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const initialProducts = storedProducts ? JSON.parse(storedProducts) : mockProducts;
      setProducts(initialProducts);

      const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      const initialCategories = storedCategories
        ? JSON.parse(storedCategories)
        : [...new Set([...initialProducts.map((product) => product.category), ...mockProducts.map((product) => product.category)])]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'vi'));
      setCategories(initialCategories);

      const storedHistory = localStorage.getItem(INVENTORY_HISTORY_STORAGE_KEY);
      setInventoryHistory(storedHistory ? JSON.parse(storedHistory) : []);

      if (!storedProducts) {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(mockProducts));
      }
      if (!storedCategories) {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories));
      }
      if (!storedHistory) {
        localStorage.setItem(INVENTORY_HISTORY_STORAGE_KEY, JSON.stringify([]));
      }
    } catch (error) {
      console.error(error);
      setProducts(mockProducts);
      message.error('Không thể đọc dữ liệu đã lưu.');
    }
  }, []);

  const sanitizePayload = (values) => {
    const payload = { ...values };
    payload.code = String(payload.code || '').trim();
    payload.name = String(payload.name || '').trim();
    payload.category = String(payload.category || '').trim();
    delete payload.id;
    delete payload._id;
    return payload;
  };

  const isDuplicateProductCode = (code, ignoreId = null) => {
    const normalized = String(code || '').trim().toLowerCase();
    return products.some((product) => {
      if (ignoreId && String(product.id) === String(ignoreId)) {
        return false;
      }
      return String(product.code || '').trim().toLowerCase() === normalized;
    });
  };

  const handleAddProduct = async (values) => {
    if (!isAdmin) {
      message.warning('Chỉ quản trị viên mới được thêm sản phẩm.');
      return;
    }

    setLoading(true);
    try {
      const cleanValues = sanitizePayload(values);
      if (!cleanValues.code) throw new Error('Mã sản phẩm không được để trống.');
      if (isDuplicateProductCode(cleanValues.code)) throw new Error('Mã sản phẩm đã tồn tại.');

      const nextProducts = [...products, { ...cleanValues, id: crypto.randomUUID() }];
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setProducts(nextProducts);
      message.success('Thêm sản phẩm thành công!');
      setModalVisible(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error(error);
      message.error(error.message || 'Lỗi khi thêm sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (values) => {
    if (!isAdmin) {
      message.warning('Chỉ quản trị viên mới được cập nhật sản phẩm.');
      return;
    }

    setLoading(true);
    try {
      const cleanValues = sanitizePayload(values);
      if (!cleanValues.code) throw new Error('Mã sản phẩm không được để trống.');
      if (isDuplicateProductCode(cleanValues.code, values.id)) {
        throw new Error('Mã sản phẩm đã tồn tại.');
      }

      const nextProducts = products.map((product) =>
        String(product.id) === String(values.id)
          ? { ...product, ...cleanValues, id: product.id }
          : product,
      );

      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setProducts(nextProducts);
      message.success('Cập nhật sản phẩm thành công!');
      setModalVisible(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error(error);
      message.error(error.message || 'Lỗi khi cập nhật sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!isAdmin) {
      message.warning('Chỉ quản trị viên mới có quyền xóa sản phẩm.');
      return;
    }

    setLoading(true);
    try {
      const nextProducts = products.filter((product) => String(product.id) !== String(id));
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setProducts(nextProducts);
      message.success('Xóa sản phẩm thành công!');
    } catch (error) {
      console.error(error);
      message.error(error.message || 'Lỗi khi xóa sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const persistCategories = (nextCategories) => {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories));
    setCategories(nextCategories);
  };

  const handleRenameCategory = (oldName, newName) => {
    const normalizedName = newName.trim();
    const nextCategories = categories.map((category) => (category === oldName ? normalizedName : category));
    const nextProducts = products.map((product) =>
      product.category === oldName ? { ...product, category: normalizedName } : product,
    );

    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories));
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setCategories(nextCategories);
      setProducts(nextProducts);
      message.success('Đã cập nhật danh mục.');
    } catch (error) {
      console.error(error);
      message.error('Không thể lưu thay đổi danh mục.');
    }
  };

  const handleDeleteCategory = (categoryName) => {
    if (products.some((product) => product.category === categoryName)) {
      message.warning('Danh mục đang có sản phẩm, hãy chuyển sản phẩm sang danh mục khác trước.');
      return;
    }

    persistCategories(categories.filter((category) => category !== categoryName));
    message.success('Đã xóa danh mục.');
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleAddNew = () => {
    if (!isAdmin) {
      message.warning('Chỉ quản trị viên mới được thêm sản phẩm.');
      return;
    }
    setSelectedProduct(null);
    setModalVisible(true);
  };

  const handleLogin = (user, token = 'demo-token') => {
    setSessionUser(user);
    localStorage.setItem('inventory-user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('inventory-token', token);
    }
  };

  const handleLogout = () => {
    setSessionUser(null);
    localStorage.removeItem('inventory-user');
    localStorage.removeItem('inventory-token');
  };

  const handleExportProducts = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      products.map((product) => ({
        code: product.code,
        name: product.name,
        category: product.category,
        quantity: product.quantity,
        unit: product.unit,
        buyPrice: product.buyPrice,
        sellPrice: product.sellPrice,
        notes: product.notes || '',
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
      if (!isAdmin) {
        message.warning('Chỉ quản trị viên mới được nhập dữ liệu Excel.');
        return;
      }

      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) {
        message.warning('File Excel không có dữ liệu.');
        return;
      }

      const normalizedProducts = rows
        .map((row) => ({
          ...row,
          id: crypto.randomUUID(),
          code: String(row.code || '').trim(),
          name: String(row.name || '').trim(),
          category: String(row.category || '').trim(),
          quantity: Number(row.quantity || 0),
          buyPrice: Number(row.buyPrice || 0),
          sellPrice: Number(row.sellPrice || 0),
          unit: String(row.unit || 'cái').trim(),
          notes: String(row.notes || '').trim(),
        }))
        .filter((product) => product.code && product.name);

      if (!normalizedProducts.length) {
        message.warning('Không có sản phẩm hợp lệ để nhập.');
        return;
      }

      const nextProducts = [...products, ...normalizedProducts];
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setProducts(nextProducts);
      message.success(`Đã nhập ${normalizedProducts.length} sản phẩm từ Excel.`);
    } catch (error) {
      console.error(error);
      message.error('Không thể đọc file Excel.');
    } finally {
      event.target.value = '';
    }
  };

  const handleMovement = (movement) => {
    try {
      const result = applyInventoryMovement(products, movement);
      const selectedProductName = products.find(
        (product) => Number(product.id) === Number(movement.productId),
      )?.name;

      const historyItem = {
        ...result.history[0],
        productName: selectedProductName,
      };

      const nextHistory = [historyItem, ...inventoryHistory];
      const nextProducts = result.products;

      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      localStorage.setItem(INVENTORY_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      setProducts(nextProducts);
      setInventoryHistory(nextHistory);
      message.success(movement.type === 'in' ? 'Nhập hàng thành công.' : 'Xuất hàng thành công.');
    } catch (error) {
      message.error(error.message || 'Không thể ghi nhận giao dịch.');
    }
  };

  const handleFormSubmit = (values) => {
    if (selectedProduct?.id) {
      handleUpdateProduct({ ...selectedProduct, ...values, id: selectedProduct.id });
    } else {
      handleAddProduct(values);
    }
  };

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
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
    { key: 'inventory', icon: <ShoppingOutlined />, label: 'Tồn kho' },
    { type: 'divider' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt' },
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
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>👤 {sessionUser.name || sessionUser.username}</span>
            <button
              type="button"
              onClick={handleLogout}
              style={{ padding: '6px 12px', border: '1px solid #d9d9d9', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
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
                  products: 'Tất cả hàng hóa',
                  categories: 'Danh mục',
                  pricing: 'Giá bán',
                  inventory: 'Tồn kho',
                  dashboard: 'Tổng quan',
                }[currentPage] || 'Trang chủ',
              },
            ]}
            style={{ marginBottom: '24px' }}
          />

          {currentPage === 'dashboard' && <Dashboard products={products} inventoryHistory={inventoryHistory} />}

          {currentPage === 'products' && (
            <ProductTable
              products={products}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onAddNew={handleAddNew}
              onExport={handleExportProducts}
              onImport={handleImportTrigger}
              loading={loading}
              canManage={isAdmin}
            />
          )}

          {currentPage === 'categories' && (
            <CategoryManager
              categories={categories}
              products={products}
              onAdd={(category) => persistCategories([...categories, category].sort((a, b) => a.localeCompare(b, 'vi')))}
              onRename={handleRenameCategory}
              onDelete={handleDeleteCategory}
            />
          )}

          {currentPage === 'pricing' && <PricingTable products={products} onEdit={handleEditProduct} />}

          {currentPage === 'inventory' && (
            <InventoryManagement products={products} inventoryHistory={inventoryHistory} onMovement={handleMovement} />
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
    </Layout>
  );
}

export default App;
