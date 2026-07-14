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
  BarcodeOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import ProductTable from './components/ProductTable';
import ProductForm from './components/ProductForm';
import './App.css';

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState('products');
  const [products, setProducts] = React.useState([]);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const apiBase = '/api/products';

  const normalizeProduct = (product) => ({
    ...product,
    id: product._id ? String(product._id) : product.id,
  });

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiBase);
      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu sản phẩm từ server');
      }
      const data = await response.json();
      setProducts(data.map(normalizeProduct));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi khi tải dữ liệu');
      message.error(err.message || 'Lỗi khi kết nối tới backend');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const sanitizePayload = (values) => {
    const { id, _id, ...payload } = values;
    return payload;
  };

  const handleAddProduct = async (values) => {
    setLoading(true);
    try {
      const response = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizePayload(values)),
      });
      if (!response.ok) {
        throw new Error('Không thể thêm sản phẩm');
      }
      await fetchProducts();
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
      const response = await fetch(`${apiBase}/${values.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizePayload(values)),
      });
      if (!response.ok) {
        throw new Error('Không thể cập nhật sản phẩm');
      }
      await fetchProducts();
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
      const response = await fetch(`${apiBase}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Không thể xóa sản phẩm');
      }
      setProducts(products.filter((p) => p.id !== id));
      message.success('Xóa sản phẩm thành công!');
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Lỗi khi xóa sản phẩm');
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
      key: 'inventory',
      icon: <BarcodeOutlined />,
      label: 'Kho hàng',
    },
    {
      key: 'tags',
      icon: <TagsOutlined />,
      label: 'Giá bán',
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
            } else if (e.key === 'dashboard') {
              setCurrentPage('dashboard');
            }
          }}
          defaultSelectedKeys={['all-products']}
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
            items={
              currentPage === 'products'
                ? [
                    { title: 'Trang chủ' },
                    { title: 'Quản lý hàng' },
                    { title: 'Danh sách hàng hóa' },
                  ]
                : [{ title: 'Trang chủ' }, { title: 'Tổng quan' }]
            }
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

          {currentPage === 'dashboard' && (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <h2>Tổng quan hệ thống</h2>
              <p>Tính năng này sẽ được phát triển tiếp...</p>
            </div>
          )}
        </Content>
      </Layout>

      {/* Form Modal */}
      <ProductForm
        visible={modalVisible}
        product={selectedProduct}
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
