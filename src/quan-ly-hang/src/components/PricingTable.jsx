import React from 'react';
import { Button, Input, Space, Table, Tag } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';

const formatVnd = (amount) => Number(amount || 0).toLocaleString('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const PricingTable = ({ products, onEdit }) => {
  const [searchText, setSearchText] = React.useState('');
  const normalizedSearch = searchText.trim().toLocaleLowerCase('vi');
  const filteredProducts = products.filter((product) =>
    `${product.code} ${product.name}`.toLocaleLowerCase('vi').includes(normalizedSearch)
  );

  const columns = [
    {
      title: 'Mã sản phẩm',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      sorter: (left, right) => left.code.localeCompare(right.code),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      sorter: (left, right) => left.name.localeCompare(right.name, 'vi'),
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag>{category}</Tag>,
    },
    {
      title: 'Giá nhập',
      dataIndex: 'buyPrice',
      key: 'buyPrice',
      align: 'right',
      sorter: (left, right) => left.buyPrice - right.buyPrice,
      render: formatVnd,
    },
    {
      title: 'Giá bán',
      dataIndex: 'sellPrice',
      key: 'sellPrice',
      align: 'right',
      sorter: (left, right) => left.sellPrice - right.sellPrice,
      render: formatVnd,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, product) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          title="Chỉnh sửa sản phẩm và giá"
          onClick={() => onEdit(product)}
        />
      ),
    },
  ];

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Bảng giá sản phẩm</h2>
          <span style={{ color: '#667085' }}>{filteredProducts.length} sản phẩm</span>
        </div>
        <Space>
          <Input
            allowClear
            placeholder="Tìm theo mã hoặc tên sản phẩm"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: 280, maxWidth: '100%' }}
          />
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={filteredProducts}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng ${total} sản phẩm` }}
        scroll={{ x: 850 }}
      />
    </section>
  );
};

export default PricingTable;