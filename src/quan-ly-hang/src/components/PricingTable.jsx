import React from 'react';
import { Button, Input, Space, Table, Tag, Image } from 'antd';
import { EditOutlined, SearchOutlined, PictureOutlined } from '@ant-design/icons';

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
      title: 'Hình ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 75,
      align: 'center',
      render: (url) => (
        url ? (
          <Image
            src={url}
            alt="Ảnh SP"
            width={40}
            height={40}
            style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }}
          />
        ) : (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#bfbfbf',
            margin: '0 auto',
            border: '1px dashed #d9d9d9',
          }}>
            <PictureOutlined style={{ fontSize: 16 }} />
          </div>
        )
      ),
    },
    {
      title: 'Mã sản phẩm',
      dataIndex: 'code',
      key: 'code',
      width: 120,
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
      width: 140,
      render: (category) => category ? <Tag color="blue">{category}</Tag> : '-',
    },
    {
      title: 'Giá nhập (Giá vốn)',
      dataIndex: 'buyPrice',
      key: 'buyPrice',
      align: 'right',
      width: 150,
      sorter: (left, right) => left.buyPrice - right.buyPrice,
      render: formatVnd,
    },
    {
      title: 'Giá bán lẻ',
      dataIndex: 'sellPrice',
      key: 'sellPrice',
      align: 'right',
      width: 150,
      sorter: (left, right) => left.sellPrice - right.sellPrice,
      render: (val) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{formatVnd(val)}</span>,
    },
    {
      title: 'Lợi nhuận dự kiến',
      key: 'profit',
      align: 'right',
      width: 150,
      render: (_, r) => {
        const profit = (r.sellPrice || 0) - (r.buyPrice || 0);
        return <span style={{ color: profit >= 0 ? '#52c41a' : '#ff4d4f' }}>{formatVnd(profit)}</span>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      align: 'center',
      fixed: 'right',
      render: (_, product) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          size="small"
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
          <h2 style={{ margin: 0, fontSize: 18 }}>Bảng giá sản phẩm</h2>
          <span style={{ color: '#667085' }}>{filteredProducts.length} sản phẩm</span>
        </div>
        <Space>
          <Input
            allowClear
            placeholder="Tìm theo mã hoặc tên..."
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
        scroll={{ x: 950 }}
      />
    </section>
  );
};

export default PricingTable;