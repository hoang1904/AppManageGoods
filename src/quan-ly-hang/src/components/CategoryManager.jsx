import React from 'react';
import { Button, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

const CategoryManager = ({ categories, products, onAdd, onRename, onDelete }) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState(null);
  const [categoryName, setCategoryName] = React.useState('');

  const openAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setCategoryName(category);
    setModalOpen(true);
  };

  const saveCategory = () => {
    const normalizedName = categoryName.trim();
    if (!normalizedName) {
      message.warning('Vui lòng nhập tên danh mục.');
      return;
    }
    if (categories.some((category) =>
      category.toLocaleLowerCase('vi') === normalizedName.toLocaleLowerCase('vi')
      && category !== editingCategory
    )) {
      message.warning('Tên danh mục đã tồn tại.');
      return;
    }

    if (editingCategory) {
      if (normalizedName !== editingCategory) onRename(editingCategory, normalizedName);
    } else {
      onAdd(normalizedName);
      message.success('Đã thêm danh mục.');
    }
    setModalOpen(false);
  };

  const columns = [
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      sorter: (left, right) => left.name.localeCompare(right.name, 'vi'),
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'Số sản phẩm',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 160,
      align: 'right',
      sorter: (left, right) => left.productCount - right.productCount,
      render: (count) => <Tag color={count ? 'blue' : 'default'}>{count} sản phẩm</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} title="Đổi tên" onClick={() => openEditModal(record.name)} />
          <Popconfirm
            title="Xóa danh mục này?"
            description={record.productCount ? 'Danh mục đang được sử dụng.' : 'Thao tác này không thể hoàn tác.'}
            onConfirm={() => onDelete(record.name)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button danger icon={<DeleteOutlined />} title="Xóa danh mục" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const dataSource = categories.map((name) => ({
    key: name,
    name,
    productCount: products.filter((product) => product.category === name).length,
  }));

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Danh mục hàng hóa</h2>
          <span style={{ color: '#667085' }}>{categories.length} danh mục</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Thêm danh mục
        </Button>
      </div>
      <Table columns={columns} dataSource={dataSource} pagination={false} />
      <Modal
        title={editingCategory ? 'Đổi tên danh mục' : 'Thêm danh mục'}
        open={modalOpen}
        onOk={saveCategory}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Input
          autoFocus
          maxLength={80}
          placeholder="Nhập tên danh mục"
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          onPressEnter={saveCategory}
        />
      </Modal>
    </section>
  );
};

export default CategoryManager;