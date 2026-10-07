import React from 'react';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons';
import { getInventorySummary } from '../data/inventoryUtils';

const formatVnd = (amount) => Number(amount || 0).toLocaleString('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const DEFAULT_FORM_VALUES = {
  productId: undefined,
  type: 'in',
  quantity: 1,
  notes: '',
};

const InventoryManagement = ({ products, inventoryHistory, onMovement }) => {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [dateFilter, setDateFilter] = React.useState(null);
  const summary = React.useMemo(() => getInventorySummary(products), [products]);

  const filteredHistory = React.useMemo(() => {
    if (!dateFilter) return inventoryHistory;
    return inventoryHistory.filter((item) => {
      const itemDate = new Date(item.createdAt);
      const selectedDate = new Date(dateFilter);
      return itemDate.toDateString() === selectedDate.toDateString();
    });
  }, [dateFilter, inventoryHistory]);

  const openModal = () => {
    form.resetFields();
    form.setFieldsValue(DEFAULT_FORM_VALUES);
    setModalOpen(true);
  };

  const handleSubmit = (values) => {
    onMovement(values);
    form.resetFields();
    setModalOpen(false);
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value) => new Date(value).toLocaleString('vi-VN'),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      width: 240,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type) => (
        <Tag color={type === 'in' ? 'green' : 'red'}>
          {type === 'in' ? 'Nhập hàng' : 'Xuất hàng'}
        </Tag>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantityDelta',
      key: 'quantityDelta',
      align: 'right',
      render: (value) => `${value > 0 ? '+' : ''}${value}`,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes) => notes || '—',
    },
  ];

  return (
    <section>
      <div className="inventory-header">
        <div>
          <h2>Quản lý tồn kho</h2>
          <p className="muted-text">Theo dõi số lượng, giá trị hàng hóa và lịch sử giao dịch.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
          Ghi nhận giao dịch
        </Button>
      </div>

      <div className="inventory-summary">
        <div className="summary-card">
          <span className="summary-label">Sản phẩm</span>
          <strong>{summary.totalProducts}</strong>
          <small>Mặt hàng đang quản lý</small>
        </div>
        <div className="summary-card">
          <span className="summary-label">Tổng tồn</span>
          <strong>{summary.totalQuantity.toLocaleString('vi-VN')}</strong>
          <small>Đơn vị hàng</small>
        </div>
        <div className="summary-card warning">
          <span className="summary-label">Sắp hết hàng</span>
          <strong>{summary.lowStockProducts}</strong>
          <small>Không quá 10 đơn vị</small>
        </div>
        <div className="summary-card success">
          <span className="summary-label">Giá trị tồn kho</span>
          <strong>{formatVnd(summary.totalValue)}</strong>
          <small>Giá bán dự kiến</small>
        </div>
      </div>

      <Alert
        className="inventory-alert"
        type="info"
        showIcon
        message="Lưu ý"
        description="Xuất hàng sẽ bị từ chối khi số lượng xuất vượt tồn kho hiện tại."
      />

      <div className="inventory-table-header">
        <div>
          <h3>Lịch sử giao dịch</h3>
        </div>
        <DatePicker
          value={dateFilter}
          onChange={setDateFilter}
          placeholder="Lọc theo ngày"
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredHistory}
        rowKey="id"
        pagination={{ pageSize: 8, showSizeChanger: true }}
        locale={{ emptyText: 'Chưa có giao dịch nào.' }}
      />

      <Modal
        title="Ghi nhận giao dịch tồn kho"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu giao dịch"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Sản phẩm"
            name="productId"
            rules={[{ required: true, message: 'Vui lòng chọn sản phẩm.' }]}
          >
            <Select
              placeholder="Chọn sản phẩm"
              options={products.map((product) => ({
                label: `${product.code} - ${product.name}`,
                value: product.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Loại giao dịch"
            name="type"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Nhập hàng', value: 'in', icon: <ArrowDownOutlined /> },
                { label: 'Xuất hàng', value: 'out', icon: <ArrowUpOutlined /> },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Số lượng"
            name="quantity"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng.' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={3} placeholder="Ví dụ: Nhập bổ sung từ nhà cung cấp" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
};

export default InventoryManagement;
