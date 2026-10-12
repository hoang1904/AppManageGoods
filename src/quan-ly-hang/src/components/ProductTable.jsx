import React from 'react';
import { Table, Space, Button, Popconfirm, Input, Select, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { getProductStatus } from '../data/inventoryUtils';

const ProductTable = ({ products, onEdit, onDelete, onAddNew, onExport, onImport, loading, canManage = false }) => {
  const [searchText, setSearchText] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [selectedStatus, setSelectedStatus] = React.useState(null);
  const [filteredProducts, setFilteredProducts] = React.useState(products);

  React.useEffect(() => {
    let filtered = products;

    if (searchText) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchText.toLowerCase()) ||
        product.code.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    if (selectedStatus) {
      filtered = filtered.filter((product) => getProductStatus(product) === selectedStatus);
    }

    setFilteredProducts(filtered);
  }, [searchText, selectedCategory, selectedStatus, products]);

  const categories = [...new Set(products.map((product) => product.category))];

  const columns = [
    {
      title: 'Mã sản phẩm',
      dataIndex: 'code',
      key: 'code',
      width: 110,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'quantity',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const status = getProductStatus(record);
        const statusMap = {
          in: { color: 'green', text: 'Còn hàng' },
          low: { color: 'gold', text: 'Sắp hết' },
          out: { color: 'red', text: 'Hết hàng' },
        };

        return <Tag color={statusMap[status].color}>{statusMap[status].text}</Tag>;
      },
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (quantity) => quantity.toLocaleString('vi-VN'),
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      width: 120,
      render: (notes) => (
        <span title={notes} style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {notes || '-'}
        </span>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 120,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="primary" icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} title="Sửa" />
          <Popconfirm
            title="Xóa sản phẩm"
            description="Bạn chắc chắn muốn xóa sản phẩm này?"
            onConfirm={() => onDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button danger icon={<DeleteOutlined />} size="small" title="Xóa" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddNew}>
            Thêm sản phẩm
          </Button>
        )}

        <Button icon={<DownloadOutlined />} onClick={onExport}>
          Xuất Excel
        </Button>

        {canManage && (
          <Button icon={<UploadOutlined />} onClick={onImport}>
            Nhập Excel
          </Button>
        )}

        <Input
          placeholder="Tìm kiếm theo mã hoặc tên..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          style={{ width: '300px' }}
        />

        <Select
          placeholder="Lọc theo danh mục"
          style={{ width: '200px' }}
          value={selectedCategory}
          onChange={setSelectedCategory}
          allowClear
          options={[
            { label: 'Tất cả', value: null },
            ...categories.map((cat) => ({ label: cat, value: cat })),
          ]}
        />

        <Select
          placeholder="Trạng thái"
          style={{ width: '160px' }}
          value={selectedStatus}
          onChange={setSelectedStatus}
          allowClear
          options={[
            { label: 'Tất cả', value: null },
            { label: 'Còn hàng', value: 'in' },
            { label: 'Sắp hết', value: 'low' },
            { label: 'Hết hàng', value: 'out' },
          ]}
        />

        <span style={{ color: '#666' }}>
          Tổng: {filteredProducts.length}/{products.length} sản phẩm
        </span>
      </div>

      <Table
        columns={columns}
        dataSource={filteredProducts}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng ${total} sản phẩm` }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default ProductTable;
