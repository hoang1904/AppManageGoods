import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Upload, Button, Image, Space, message, Tabs } from 'antd';
import { UploadOutlined, DeleteOutlined, PictureOutlined, LinkOutlined } from '@ant-design/icons';

const ProductForm = ({ visible, onCancel, onSubmit, product, loading, categories = [] }) => {
  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState('');
  const [imageTab, setImageTab] = useState('upload');

  // Điền dữ liệu vào form khi modal mở
  useEffect(() => {
    if (visible) {
      if (product) {
        form.setFieldsValue(product);
        setImageUrl(product.imageUrl || '');
      } else {
        form.resetFields();
        setImageUrl('');
      }
    }
  }, [product, visible, form]);

  const handleCancel = () => {
    form.resetFields();
    setImageUrl('');
    onCancel();
  };

  const handleSubmit = (values) => {
    onSubmit({
      ...product,
      ...values,
      imageUrl: imageUrl || '',
    });
    form.resetFields();
    setImageUrl('');
  };

  // Xử lý nén và chuyển đổi file ảnh sang Base64
  const handleFileUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Vui lòng chọn file hình ảnh (JPG, PNG, WebP)!');
      return false;
    }

    const isLt3M = file.size / 1024 / 1024 < 3;
    if (!isLt3M) {
      message.error('Kích thước ảnh nên nhỏ hơn 3MB!');
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // Dùng canvas resize nhẹ để ảnh luôn sắc nét và lưu trữ tối ưu
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setImageUrl(compressedDataUrl);
        message.success('Đã tải và tối ưu ảnh sản phẩm thành công!');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    return false; // Chặn upload mặc định của Antd
  };

  // Danh mục gợi ý mặc định nếu chưa có
  const defaultCategories = ['Thực phẩm', 'Đồ uống', 'Thời trang', 'Mẹ & Bé', 'Gia dụng', 'Điện tử', 'Khác'];
  const allCategories = Array.from(new Set([...(categories || []), ...defaultCategories]));

  return (
    <Modal
      title={product?.id ? '✏️ Sửa sản phẩm' : '📦 Thêm sản phẩm mới'}
      open={visible}
      onCancel={handleCancel}
      onOk={form.submit}
      confirmLoading={loading}
      width={640}
      okText={product?.id ? 'Cập nhật' : 'Thêm mới'}
      cancelText="Hủy"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ unit: 'cái', quantity: 0, buyPrice: 0, sellPrice: 0 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            label="Mã sản phẩm"
            name="code"
            rules={[{ required: true, message: 'Vui lòng nhập mã sản phẩm' }]}
          >
            <Input placeholder="VD: SP001" />
          </Form.Item>

          <Form.Item
            label="Tên sản phẩm"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input placeholder="VD: Áo thun Polo nam" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            label="Danh mục"
            name="category"
            rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
          >
            <Select
              placeholder="Chọn hoặc nhập danh mục"
              options={allCategories.map((c) => ({ label: c, value: c }))}
              showSearch
            />
          </Form.Item>

          <Form.Item
            label="Đơn vị tính"
            name="unit"
            rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}
          >
            <Select
              placeholder="Chọn đơn vị"
              options={[
                { label: 'Cái', value: 'cái' },
                { label: 'Hộp', value: 'hộp' },
                { label: 'Gói', value: 'gói' },
                { label: 'Chai', value: 'chai' },
                { label: 'Lon', value: 'lon' },
                { label: 'Kg', value: 'kg' },
                { label: 'Thùng', value: 'thùng' },
              ]}
            />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <Form.Item
            label="Số lượng tồn kho"
            name="quantity"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>

          <Form.Item
            label="Giá mua (Giá vốn)"
            name="buyPrice"
            rules={[{ required: true, message: 'Vui lòng nhập giá mua' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item
            label="Giá bán lẻ"
            name="sellPrice"
            rules={[{ required: true, message: 'Vui lòng nhập giá bán' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              placeholder="0"
            />
          </Form.Item>
        </div>

        {/* ─── Mục Hình ảnh sản phẩm ─── */}
        <div style={{ marginBottom: 16, padding: '12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <PictureOutlined style={{ color: '#1677ff' }} />
            <span>Hình ảnh sản phẩm</span>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Khung xem trước ảnh */}
            <div style={{
              width: 100,
              height: 100,
              borderRadius: 8,
              border: '2px dashed #d9d9d9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: '#fff',
              flexShrink: 0,
            }}>
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt="Ảnh xem trước"
                  width={96}
                  height={96}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: 12 }}>
                  <PictureOutlined style={{ fontSize: 24, display: 'block', marginBottom: 4 }} />
                  Chưa có ảnh
                </div>
              )}
            </div>

            {/* Điều khiển ảnh */}
            <div style={{ flex: 1 }}>
              <Tabs
                activeKey={imageTab}
                onChange={setImageTab}
                size="small"
                items={[
                  {
                    key: 'upload',
                    label: <span><UploadOutlined /> Tải ảnh từ máy</span>,
                    children: (
                      <Space orientation="vertical" style={{ width: '100%' }}>
                        <Upload
                          beforeUpload={handleFileUpload}
                          showUploadList={false}
                          accept="image/*"
                        >
                          <Button icon={<UploadOutlined />}>Chọn file ảnh từ máy</Button>
                        </Upload>
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>Hỗ trợ JPG, PNG, WebP (tự tối ưu nén ảnh)</span>
                      </Space>
                    ),
                  },
                  {
                    key: 'link',
                    label: <span><LinkOutlined /> Dán link URL</span>,
                    children: (
                      <Input
                        placeholder="https://example.com/hinh-anh.jpg"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        allowClear
                      />
                    ),
                  },
                ]}
              />

              {imageUrl && (
                <Button
                  danger
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => setImageUrl('')}
                  style={{ marginTop: 8 }}
                >
                  Xóa ảnh hiện tại
                </Button>
              )}
            </div>
          </div>
        </div>

        <Form.Item label="Ghi chú thêm" name="notes">
          <Input.TextArea placeholder="Mô tả hoặc ghi chú thêm về sản phẩm..." rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProductForm;
