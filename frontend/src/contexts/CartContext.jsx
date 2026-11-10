import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [items, setItems] = useState([]);

  const addItem = (productOrPayload, selectedOptions = [], quantity = 1, branchId = null) => {
    let newItem;
    if (productOrPayload && typeof productOrPayload === 'object' && productOrPayload.product) {
      newItem = productOrPayload;
    } else {
      newItem = { product: productOrPayload, selectedOptions, quantity, branchId };
    }

    if (activeBranchId && newItem.branchId && activeBranchId !== newItem.branchId) {
      return { conflict: true, existingBranchId: activeBranchId };
    }

    if (newItem.branchId) {
      setActiveBranchId(newItem.branchId);
    }

    setItems((prev) => [...prev, newItem]);
    return { success: true };
  };

  const clearCart = () => {
    setItems([]);
    setActiveBranchId(null);
  };

  const totalItemsCount = items.reduce((sum, it) => sum + (it.quantity || 1), 0);

  return (
    <CartContext.Provider value={{ items, totalItemsCount, activeBranchId, addItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
