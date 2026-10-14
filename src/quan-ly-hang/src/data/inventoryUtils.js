export const LOW_STOCK_THRESHOLD = 10;

export const getProductStatus = (product = {}) => {
  const quantity = Number(product.quantity || 0);
  if (quantity <= 0) return 'out';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'low';
  return 'in';
};

export const getInventorySummary = (products = []) => {
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
  const lowStockProducts = products.filter((p) => Number(p.quantity || 0) <= LOW_STOCK_THRESHOLD).length;
  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.quantity || 0) * Number(p.sellPrice || 0),
    0,
  );
  return { totalProducts, totalQuantity, lowStockProducts, totalValue };
};

export const applyInventoryMovement = (products, movement) => {
  // So sánh id dạng chuỗi để tương thích cả id số (dữ liệu cũ) và UUID (dữ liệu mới)
  const productId = String(movement.productId);
  const quantity = Number(movement.quantity);

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Số lượng giao dịch không hợp lệ.');
  }

  let found = false;
  const nextProducts = products.map((product) => {
    if (String(product.id) !== productId) return product;

    found = true;
    const currentQty = Number(product.quantity || 0);
    const nextQuantity = movement.type === 'in'
      ? currentQty + quantity
      : currentQty - quantity;

    if (movement.type === 'out' && nextQuantity < 0) {
      throw new Error(`Sản phẩm "${product.name}" không đủ hàng để xuất (tồn kho: ${currentQty}).`);
    }

    return { ...product, quantity: nextQuantity };
  });

  if (!found) {
    throw new Error('Không tìm thấy sản phẩm.');
  }

  return {
    products: nextProducts,
    history: [{
      id: crypto.randomUUID(),
      productId,
      type: movement.type,
      quantity,
      quantityDelta: movement.type === 'in' ? quantity : -quantity,
      notes: movement.notes || '',
      createdAt: new Date().toISOString(),
    }],
  };
};
