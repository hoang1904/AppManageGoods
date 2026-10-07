import React from 'react';
import { Card, Col, Row, Statistic, Table, Tag } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, StockOutlined, WarningOutlined } from '@ant-design/icons';
import { getInventorySummary } from '../data/inventoryUtils';

const formatVnd = (amount) => Number(amount || 0).toLocaleString('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const Dashboard = ({ products, inventoryHistory }) => {
  const summary = React.useMemo(() => getInventorySummary(products), [products]);

  const lowStockProducts = products
    .filter((product) => Number(product.quantity || 0) <= 10)
    .slice(0, 5)
    .map((product) => ({
      key: product.id,
      name: product.name,
      quantity: product.quantity,
      category: product.category,
    }));

  const recentMovements = inventoryHistory
    .slice(0, 5)
    .map((item) => ({
      key: item.id,
      name: item.productName,
      type: item.type,
      quantity: item.quantity,
      createdAt: new Date(item.createdAt).toLocaleString('vi-VN'),
    }));

  return (
    <section>
      <div className="dashboard-header">
        <div>
          <h2>Tổng quan hệ thống</h2>
          <p className="muted-text">Theo dõi tình trạng hàng hóa và hoạt động gần đây.</p>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Số sản phẩm"
              value={summary.totalProducts}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng tồn kho"
              value={summary.totalQuantity}
              prefix={<StockOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Giá trị tồn kho"
              value={summary.totalValue}
              precision={0}
              formatter={(value) => formatVnd(value)}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Sắp hết hàng"
              value={summary.lowStockProducts}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Sản phẩm cần chú ý" extra={<Tag color="gold">Tồn kho thấp</Tag>}>
            <Table
              columns={[
                { title: 'Sản phẩm', dataIndex: 'name', key: 'name' },
                { title: 'Danh mục', dataIndex: 'category', key: 'category' },
                { title: 'Tồn kho', dataIndex: 'quantity', key: 'quantity', align: 'right' },
              ]}
              dataSource={lowStockProducts}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Không có sản phẩm nào sắp hết hàng.' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Giao dịch gần đây">
            <Table
              columns={[
                { title: 'Sản phẩm', dataIndex: 'name', key: 'name' },
                { title: 'Loại', dataIndex: 'type', key: 'type', render: (type) => <Tag color={type === 'in' ? 'green' : 'red'}>{type === 'in' ? 'Nhập' : 'Xuất'}</Tag> },
                { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', align: 'right' },
                { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt' },
              ]}
              dataSource={recentMovements}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có giao dịch nào.' }}
            />
          </Card>
        </Col>
      </Row>
    </section>
  );
};

export default Dashboard;
