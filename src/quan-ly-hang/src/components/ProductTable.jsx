import React from 'react';
import { Table, Space, Button, Popconfirm, Input, Select, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';

const ProductTable = ({ products, onEdit, onDelete, onAddNew, loading }) => {
  const [searchText, setSearchText] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [filteredProducts, setFilteredProducts] = React.useState(products);

  // Lọc dữ liệu
  React.useEffect(() => {
    let filtered = products;

    if (searchText) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchText.toLowerCase()) ||
        product.code.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [searchText, selectedCategory, products]);

  // Lấy danh sách danh mục duy nhất
  const categories = [...new Set(products.map((p) => p.category))];

  const columns = [
    {
      title: 'Mã sản phẩm',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      width: 250,
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
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(record)}
            title="Sửa"
          />
          <Popconfirm
            title="Xóa sản phẩm"
            description="Bạn chắc chắn muốn xóa sản phẩm này?"
            onConfirm={() => onDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              title="Xóa"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAddNew}
        >
          Thêm sản phẩm
        </Button>

        <Input
          placeholder="Tìm kiếm theo mã hoặc tên..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
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
        scroll={{ x: 1050 }}
      />
    </div>
  );
};

export default ProductTable;
