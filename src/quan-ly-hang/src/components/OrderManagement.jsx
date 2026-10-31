import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  InputNumber,
  Button,
  Table,
  Input,
  Typography,
  Divider,
  Tag,
  Tabs,
  Modal,
  Space,
  message,
  Popconfirm,
  Empty,
} from 'antd';
import {
  ShoppingCartOutlined,
  PlusOutlined,
  DeleteOutlined,
  PrinterOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { api } from '../services/api';

const { Title, Text } = Typography;

// Hàm chuyển số thành định dạng tiền Việt Nam
const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

export default function OrderManagement({ products = [], onOrderCompleted }) {
  const [activeTab, setActiveTab] = useState('create');
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Danh sách đơn hàng
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Modal in hóa đơn
  const [previewOrder, setPreviewOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const data = await api.getOrders();
      setOrders(data);
    } catch {
      message.error('Không thể tải danh sách đơn hàng.');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchOrders();
    }
  }, [activeTab]);

  // Thêm sản phẩm vào giỏ hàng
  const handleAddToCart = () => {
    if (!selectedProductId) {
      message.warning('Vui lòng chọn một sản phẩm.');
      return;
    }

    const product = products.find((p) => String(p.id) === String(selectedProductId));
    if (!product) return;

    if (product.quantity <= 0) {
      message.error(`"${product.name}" hiện đã hết hàng trong kho.`);
      return;
    }

    const existingIndex = cart.findIndex((item) => String(item.productId) === String(product.id));
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > product.quantity) {
        message.warning(`"${product.name}" chỉ còn ${product.quantity} ${product.unit || 'cái'} trong kho.`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      newCart[existingIndex].subtotal = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          productId: String(product.id),
          productCode: product.code,
          productName: product.name,
          unit: product.unit || 'cái',
          stock: product.quantity,
          imageUrl: product.imageUrl || '',
          unitPrice: product.sellPrice || 0,
          quantity: 1,
          subtotal: product.sellPrice || 0,
        },
      ]);
    }

    setSelectedProductId(null);
  };

  // Cập nhật số lượng trong giỏ
  const handleQuantityChange = (productId, newQty) => {
    if (!newQty || newQty < 1) return;
    const newCart = cart.map((item) => {
      if (String(item.productId) === String(productId)) {
        const validQty = Math.min(newQty, item.stock);
        if (newQty > item.stock) {
          message.warning(`Số lượng không được vượt quá tồn kho (${item.stock} ${item.unit}).`);
        }
        return {
          ...item,
          quantity: validQty,
          subtotal: validQty * item.unitPrice,
        };
      }
      return item;
    });
    setCart(newCart);
  };

  // Cập nhật giá bán tùy chỉnh (nếu muốn giảm giá cho khách)
  const handlePriceChange = (productId, newPrice) => {
    if (newPrice < 0) return;
    const newCart = cart.map((item) => {
      if (String(item.productId) === String(productId)) {
        return {
          ...item,
          unitPrice: newPrice,
          subtotal: item.quantity * newPrice,
        };
      }
      return item;
    });
    setCart(newCart);
  };

  // Xóa sản phẩm khỏi giỏ
  const handleRemoveItem = (productId) => {
    setCart(cart.filter((item) => String(item.productId) !== String(productId)));
  };

  // Tính tổng đơn hàng
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);

  // Tạo đơn hàng
  const handleCreateOrder = async (shouldPrint = false) => {
    if (cart.length === 0) {
      message.warning('Giỏ hàng chưa có sản phẩm nào!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerName: customerName.trim() || 'Khách lẻ',
        customerPhone: customerPhone.trim(),
        notes: orderNotes.trim(),
        items: cart.map((item) => ({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        })),
      };

      const result = await api.createOrder(payload);
      message.success(`Đã tạo đơn hàng ${result.order.orderCode} thành công!`);

      // Callback để cập nhật lại danh sách sản phẩm và tồn kho ngoài App
      if (onOrderCompleted) {
        onOrderCompleted(result);
      }

      // Xóa form giỏ hàng
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setOrderNotes('');

      // Nếu chọn In phiếu
      if (shouldPrint) {
        setPreviewOrder(result.order);
      }
    } catch (error) {
      message.error(error.message || 'Không thể tạo đơn hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  // In hóa đơn
  const handlePrint = () => {
    window.print();
  };

  // Cột bảng giỏ hàng
  const cartColumns = [
    {
      title: 'STT',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Mã / Tên sản phẩm',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {record.imageUrl ? (
            <img
              src={record.imageUrl}
              alt=""
              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bfbfbf',
              fontSize: 16,
              flexShrink: 0,
            }}>
              📦
            </div>
          )}
          <div>
            <Text strong>{record.productName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Mã: {record.productCode} | Tồn: {record.stock} {record.unit}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Đơn giá bán',
      width: 140,
      render: (_, record) => (
        <InputNumber
          min={0}
          step={1000}
          value={record.unitPrice}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
          onChange={(val) => handlePriceChange(record.productId, val)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Số lượng',
      width: 130,
      render: (_, record) => (
        <Space orientation="horizontal">
          <InputNumber
            min={1}
            max={record.stock}
            value={record.quantity}
            onChange={(val) => handleQuantityChange(record.productId, val)}
            style={{ width: 80 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.unit}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Thành tiền',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Text strong style={{ color: '#1677ff' }}>
          {formatCurrency(record.subtotal)}
        </Text>
      ),
    },
    {
      title: '',
      width: 50,
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.productId)}
        />
      ),
    },
  ];

  // Cột bảng lịch sử đơn
  const orderColumns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderCode',
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      render: (date) => (date ? new Date(date).toLocaleString('vi-VN') : '—'),
    },
    {
      title: 'Khách hàng',
      render: (_, record) => (
        <div>
          <Text strong>{record.customerName || 'Khách lẻ'}</Text>
          {record.customerPhone && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                📞 {record.customerPhone}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Số mặt hàng',
      dataIndex: 'totalQuantity',
      align: 'center',
      render: (qty, record) => `${qty} món (${record.items?.length || 0} loại)`,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Người lập',
      dataIndex: 'performedBy',
      render: (user) => user || '—',
    },
    {
      title: 'Thao tác',
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          icon={<PrinterOutlined />}
          onClick={() => setPreviewOrder(record)}
        >
          Xem & In
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'create',
            label: (
              <span>
                <ShoppingCartOutlined /> Tạo đơn bán hàng / Xuất kho
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                {/* Cột trái: Chọn hàng và giỏ hàng */}
                <Col xs={24} lg={16}>
                  <Card
                    title="Chi tiết đơn xuất / bán hàng"
                    extra={
                      <Space>
                        <Select
                          showSearch
                          placeholder="🔍 Tìm sản phẩm theo tên hoặc mã..."
                          optionFilterProp="label"
                          style={{ width: 320 }}
                          value={selectedProductId}
                          onChange={setSelectedProductId}
                          options={products.map((p) => ({
                            value: String(p.id),
                            label: `[${p.code}] ${p.name} (Tồn: ${p.quantity} ${p.unit || 'cái'})`,
                            disabled: p.quantity <= 0,
                          }))}
                        />
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={handleAddToCart}
                          disabled={!selectedProductId}
                        >
                          Thêm
                        </Button>
                      </Space>
                    }
                  >
                    <Table
                      dataSource={cart}
                      columns={cartColumns}
                      rowKey="productId"
                      pagination={false}
                      locale={{
                        emptyText: (
                          <Empty
                            description="Chưa có sản phẩm nào trong đơn. Hãy chọn sản phẩm ở ô tìm kiếm phía trên để thêm vào."
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        ),
                      }}
                    />
                  </Card>
                </Col>

                {/* Cột phải: Thông tin khách và thanh toán */}
                <Col xs={24} lg={8}>
                  <Card title="Thông tin thanh toán & Khách hàng">
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary">Tên khách hàng:</Text>
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="Khách lẻ"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{ marginTop: 4 }}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary">Số điện thoại:</Text>
                      <Input
                        prefix={<PhoneOutlined />}
                        placeholder="09xx xxx xxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        style={{ marginTop: 4 }}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary">Ghi chú đơn hàng:</Text>
                      <Input.TextArea
                        rows={2}
                        placeholder="Ví dụ: Giao buổi chiều, khách quen..."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        style={{ marginTop: 4 }}
                      />
                    </div>

                    <Divider />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text>Tổng số mặt hàng:</Text>
                      <Text strong>{totalQuantity} sản phẩm</Text>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <Text style={{ fontSize: 16 }}>Tổng tiền thanh toán:</Text>
                      <Title level={3} style={{ margin: 0, color: '#1677ff' }}>
                        {formatCurrency(totalAmount)}
                      </Title>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<PrinterOutlined />}
                        block
                        loading={submitting}
                        disabled={cart.length === 0}
                        onClick={() => handleCreateOrder(true)}
                        style={{ height: 48, fontSize: 16, background: '#52c41a', borderColor: '#52c41a' }}
                      >
                        Tạo đơn & In phiếu xuất
                      </Button>

                      <Button
                        type="default"
                        size="large"
                        icon={<CheckCircleOutlined />}
                        block
                        loading={submitting}
                        disabled={cart.length === 0}
                        onClick={() => handleCreateOrder(false)}
                      >
                        Chỉ lưu đơn (không in)
                      </Button>

                      {cart.length > 0 && (
                        <Popconfirm
                          title="Hủy đơn hàng này?"
                          description="Tất cả các món trong giỏ hàng hiện tại sẽ bị xóa."
                          onConfirm={() => setCart([])}
                          okText="Hủy đơn"
                          cancelText="Không"
                        >
                          <Button type="text" danger block>
                            Xóa toàn bộ giỏ hàng
                          </Button>
                        </Popconfirm>
                      )}
                    </Space>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> Lịch sử đơn hàng đã bán
              </span>
            ),
            children: (
              <Card
                title="Danh sách đơn hàng đã xuất"
                extra={
                  <Button onClick={fetchOrders} loading={ordersLoading}>
                    Làm mới
                  </Button>
                }
              >
                <Table
                  dataSource={orders}
                  columns={orderColumns}
                  rowKey={(r) => r.id || r.orderCode}
                  loading={ordersLoading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Modal In Hóa Đơn / Phiếu Xuất Kho */}
      <Modal
        open={Boolean(previewOrder)}
        onCancel={() => setPreviewOrder(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewOrder(null)}>
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
          >
            In hóa đơn ngay
          </Button>,
        ]}
        width={720}
        destroyOnClose
      >
        {previewOrder && (
          <div id="printable-invoice" style={{ padding: '16px 24px', color: '#111', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase' }}>
                HÓA ĐƠN BÁN HÀNG / PHIẾU XUẤT KHO
              </div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                Hệ thống Quản lý Kho Hàng & Cửa Hàng
              </div>
            </div>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div><strong>Mã đơn:</strong> {previewOrder.orderCode}</div>
                <div><strong>Khách hàng:</strong> {previewOrder.customerName || 'Khách lẻ'}</div>
                {previewOrder.customerPhone && (
                  <div><strong>Số điện thoại:</strong> {previewOrder.customerPhone}</div>
                )}
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <div>
                  <strong>Ngày lập:</strong>{' '}
                  {new Date(previewOrder.createdAt || Date.now()).toLocaleString('vi-VN')}
                </div>
                <div><strong>Người bán:</strong> {previewOrder.performedBy || 'Nhân viên'}</div>
              </Col>
            </Row>

            {previewOrder.notes && (
              <div style={{ marginBottom: 12, fontSize: 13, fontStyle: 'italic' }}>
                <strong>Ghi chú:</strong> {previewOrder.notes}
              </div>
            )}

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ccc' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: 40 }}>STT</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left' }}>Tên sản phẩm</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: 60 }}>ĐVT</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: 60 }}>SL</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', width: 110 }}>Đơn giá</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', width: 120 }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(previewOrder.items || []).map((item, index) => (
                  <tr key={item.productId || index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ fontWeight: 500 }}>{item.productName}</div>
                      {item.productCode && (
                        <div style={{ fontSize: 11, color: '#777' }}>Mã: {item.productCode}</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>{item.unit || 'cái'}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <div style={{ fontSize: 14 }}>
                Tổng số lượng: <strong>{previewOrder.totalQuantity}</strong>
              </div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#000', marginTop: 4 }}>
                TỔNG TIỀN THANH TOÁN:{' '}
                <span style={{ color: '#1677ff' }}>
                  {formatCurrency(previewOrder.totalAmount)}
                </span>
              </div>
            </div>

            <Row style={{ marginTop: 32, textAlign: 'center' }}>
              <Col span={12}>
                <div style={{ fontWeight: 'bold' }}>Khách hàng ký nhận</div>
                <div style={{ fontSize: 12, color: '#888' }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 60 }} />
              </Col>
              <Col span={12}>
                <div style={{ fontWeight: 'bold' }}>Người lập phiếu</div>
                <div style={{ fontSize: 12, color: '#888' }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 60 }} />
                <div>{previewOrder.performedBy}</div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* CSS đặc biệt cho việc in hóa đơn */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }
          .ant-modal-close, .ant-modal-footer, .ant-modal-header {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
