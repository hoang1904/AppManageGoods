import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyInventoryMovement,
  getInventorySummary,
} from './inventoryUtils.js';

test('applyInventoryMovement increases stock for incoming products', () => {
  const products = [{ id: 1, quantity: 10 }];

  const result = applyInventoryMovement(products, {
    productId: 1,
    type: 'in',
    quantity: 5,
    notes: 'Nhập bổ sung',
  });

  assert.deepEqual(result.products[0].quantity, 15);
  assert.equal(result.history[0].quantityDelta, 5);
});

test('applyInventoryMovement rejects outgoing quantity exceeding stock', () => {
  const products = [{ id: 1, quantity: 10 }];

  assert.throws(
    () => applyInventoryMovement(products, {
      productId: 1,
      type: 'out',
      quantity: 11,
    }),
    /không đủ hàng/,
  );
});

test('getInventorySummary calculates stock and inventory value', () => {
  const summary = getInventorySummary([
    { quantity: 10, sellPrice: 100 },
    { quantity: 5, sellPrice: 200 },
    { quantity: 0, sellPrice: 50 },
  ]);

  assert.deepEqual(summary, {
    totalProducts: 3,
    totalQuantity: 15,
    lowStockProducts: 3,
    totalValue: 2000,
  });
});
