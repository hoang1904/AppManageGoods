import React from 'react';
import {
  Layout,
  Menu,
  message,
  Breadcrumb,
} from 'antd';
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
import { mockProducts } from './data/mockData';
import { applyInventoryMovement } from './data/inventoryUtils';
import './App.css';

const { Header, Sider, Content } = Layout;
const PRODUCTS_STORAGE_KEY = 'quan-ly-hang-products';
const CATEGORIES_STORAGE_KEY = 'quan-ly-hang-categories';
const INVENTORY_HISTORY_STORAGE_KEY = 'quan-ly-hang-inventory-history';

function App() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState('products');
  const [products, setProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [inventoryHistory, setInventoryHistory] = React.useState([]);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const initialProducts = storedProducts ? JSON.parse(storedProducts) : mockProducts;
      setProducts(initialProducts);
      const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      const initialCategories = storedCategories
        ? JSON.parse(storedCategories)
        : [...new Set([...initialProducts.map((product) => product.category), ...mockProducts.map((product) => product.category)])].filter(Boolean).sort();
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
    } catch (err) {
      console.error(err);
      setProducts(mockProducts);
      message.error('Không thể đọc dữ liệu sản phẩm đã lưu.');
    }
  }, []);

  const sanitizePayload = (values) => {
    const payload = { ...values };
    delete payload.id;
    delete payload._id;
    return payload;
  };

  const handleAddProduct = async (values) => {
    setLoading(true);
    try {
      const nextProducts = [
        ...products,
        { ...sanitizePayload(values), id: crypto.randomUUID() },
      ];
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setProducts(nextProducts);
      message.success('Thêm sản phẩm thành công!');
      setModalVisible(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Lỗi khi thêm sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (values) => {
    setLoading(true);
    try {
      const nextProducts = products.map((product) =>
        String(product.id) === String(values.id)
          ? { ...product, ...sanitizePayload(values), id: product.id }
          : product
      );
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setProducts(nextProducts);
      message.success('Cập nhật sản phẩm thành công!');
      setModalVisible(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Lỗi khi cập nhật sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    setLoading(true);
    try {
      const nextProducts = products.filter((product) => String(product.id) !== String(id));
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setProducts(nextProducts);
      message.success('Xóa sản phẩm thành công!');
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Lỗi khi xóa sản phẩm');
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
    const nextCategories = categories.map((category) => category === oldName ? normalizedName : category);
    const nextProducts = products.map((product) =>
      product.category === oldName ? { ...product, category: normalizedName } : product
    );
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories));
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
      setCategories(nextCategories);
      setProducts(nextProducts);
      message.success('Đã cập nhật danh mục.');
    } catch (err) {
      console.error(err);
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

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    {
      key: 'products',
      icon: <ShoppingOutlined />,
      label: 'Quản lý hàng',
      children: [
        {
          key: 'all-products',
          label: 'Tất cả hàng hóa',
        },
        {
          key: 'categories',
          label: 'Danh mục',
        },
      ],
    },
    {
      key: 'pricing',
      icon: <TagsOutlined />,
      label: 'Giá bán',
    },
    {
      key: 'inventory',
      icon: <ShoppingOutlined />,
      label: 'Tồn kho',
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];


  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={200}
        theme="light"
      >
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1990ff',
          }}
        >
          {!collapsed && 'Quản Lý Hàng'}
        </div>
        <Menu
          mode="inline"
          items={menuItems}
          onClick={(e) => {
            if (e.key === 'all-products') {
              setCurrentPage('products');
            } else if (e.key === 'categories') {
              setCurrentPage('categories');
            } else if (e.key === 'pricing') {
              setCurrentPage('pricing');
            } else if (e.key === 'inventory') {
              setCurrentPage('inventory');
            } else if (e.key === 'dashboard') {
              setCurrentPage('dashboard');
            }
          }}
          selectedKeys={[currentPage === 'products' ? 'all-products' : currentPage]}
          defaultOpenKeys={['products']}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        {/* Header */}
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
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            Hệ thống quản lý kho hàng
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>👤 Admin</span>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
          }}
        >
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { title: 'Trang chủ' },
              ...(currentPage === 'products' || currentPage === 'categories'
                ? [{ title: 'Quản lý hàng' }]
                : []),
              { title: {
                products: 'Tất cả hàng hóa',
                categories: 'Danh mục',
                pricing: 'Giá bán',
                inventory: 'Tồn kho',
                dashboard: 'Tổng quan',
              }[currentPage] || 'Trang chủ' },
            ]}
            style={{ marginBottom: '24px' }}
          />

          {/* Page Content */}
          {currentPage === 'products' && (
            <ProductTable
              products={products}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onAddNew={handleAddNew}
              loading={loading}
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

          {currentPage === 'pricing' && (
            <PricingTable products={products} onEdit={handleEditProduct} />
          )}

          {currentPage === 'inventory' && (
            <InventoryManagement
              products={products}
              inventoryHistory={inventoryHistory}
              onMovement={(movement) => {
                try {
                  const result = applyInventoryMovement(products, movement);
                  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(result.products));
                  localStorage.setItem(INVENTORY_HISTORY_STORAGE_KEY, JSON.stringify([
                    {
                      ...result.history[0],
                      productName: products.find((product) => Number(product.id) === Number(movement.productId))?.name,
                    },
                    ...inventoryHistory,
                  ]));
                  setProducts(result.products);
                  setInventoryHistory((currentHistory) => [{
                    ...result.history[0],
                    productName: products.find((product) => Number(product.id) === Number(movement.productId))?.name,
                  }, ...currentHistory]);
                  message.success(movement.type === 'in' ? 'Nhập hàng thành công.' : 'Xuất hàng thành công.');
                } catch (error) {
                  message.error(error.message || 'Không thể ghi nhận giao dịch.');
                }
              }}
            />
          )}

          {currentPage === 'dashboard' && (
            <Dashboard products={products} inventoryHistory={inventoryHistory} />
          )}
        </Content>
      </Layout>

      {/* Form Modal */}
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
