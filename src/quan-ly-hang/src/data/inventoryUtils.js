export const LOW_STOCK_THRESHOLD = 10;

export const getInventorySummary = (products = []) => {
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, product) => sum + Number(product.quantity || 0), 0);
  const lowStockProducts = products.filter((product) => Number(product.quantity || 0) <= LOW_STOCK_THRESHOLD).length;
  const totalValue = products.reduce(
    (sum, product) => sum + Number(product.quantity || 0) * Number(product.sellPrice || 0),
    0,
  );

  return {
    totalProducts,
    totalQuantity,
    lowStockProducts,
    totalValue,
  };
};

export const applyInventoryMovement = (products, movement) => {
  const productId = Number(movement.productId);
  const quantity = Number(movement.quantity);

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Số lượng giao dịch không hợp lệ.');
  }

  const nextProducts = products.map((product) => {
    if (Number(product.id) !== productId) {
      return product;
    }

    const nextQuantity = movement.type === 'in'
      ? Number(product.quantity || 0) + quantity
      : Number(product.quantity || 0) - quantity;

    if (movement.type === 'out' && nextQuantity < 0) {
      throw new Error('Sản phẩm không đủ hàng để xuất.');
    }

    return {
      ...product,
      quantity: nextQuantity,
    };
  });

  if (!nextProducts.some((product) => Number(product.id) === productId)) {
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
