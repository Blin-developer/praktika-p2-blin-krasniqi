import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

const STORAGE_KEYS = {
  ITEMS: 'tastio_cart_items',
  BRANCH_ID: 'tastio_cart_branch_id',
  RESTAURANT: 'tastio_cart_restaurant',
};

export function CartProvider({ children }) {
  // Inicializimi nga localStorage për ruajtje të qëndrueshme gjatë rifreskimit
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Gabim gjatë leximit të shportës nga localStorage', e);
      return [];
    }
  });

  const [activeBranchId, setActiveBranchId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.BRANCH_ID) || null;
    } catch {
      return null;
    }
  });

  const [activeRestaurant, setActiveRestaurant] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESTAURANT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [conflictState, setConflictState] = useState({
    isOpen: false,
    pendingItem: null,
  });

  // Sinkronizimi automatik në localStorage sa herë ndryshon shporta
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      if (activeBranchId) {
        localStorage.setItem(STORAGE_KEYS.BRANCH_ID, String(activeBranchId));
      } else {
        localStorage.removeItem(STORAGE_KEYS.BRANCH_ID);
      }
      if (activeRestaurant) {
        localStorage.setItem(STORAGE_KEYS.RESTAURANT, JSON.stringify(activeRestaurant));
      } else {
        localStorage.removeItem(STORAGE_KEYS.RESTAURANT);
      }
    } catch (e) {
      console.error('Gabim gjatë ruajtjes së shportës në localStorage', e);
    }
  }, [items, activeBranchId, activeRestaurant]);

  // Hapja dhe mbyllja e Cart Drawer
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  /**
   * Krijon një çelës unik për krahasimin e artikujve me të njëjtat opsione
   */
  const getProductFingerprint = (productId, selectedChoices = {}) => {
    const sortedChoices = Object.keys(selectedChoices)
      .sort()
      .map((k) => `${k}:${(selectedChoices[k] || []).slice().sort().join(',')}`)
      .join('|');
    return `${productId}__${sortedChoices}`;
  };

  /**
   * Shton një produkt në shportë.
   * Trajton konfliktin nëse produkti vjen nga një restorant/degë tjetër.
   */
  const addItem = (payload) => {
    let newItem;
    if (payload && typeof payload === 'object' && payload.product) {
      newItem = {
        ...payload,
        unitPrice: payload.finalPrice || parseFloat(payload.product.base_price || 0),
        quantity: payload.quantity || 1,
      };
    } else {
      newItem = {
        product: payload,
        quantity: 1,
        unitPrice: parseFloat(payload?.base_price || 0),
        selectedChoices: {},
      };
    }

    const itemBranchId = newItem.branchId ? String(newItem.branchId) : null;

    // Kontrolli i konfliktit të restorantit (Wolt rule: 1 restorant për porosi)
    if (items.length > 0 && activeBranchId && itemBranchId && String(activeBranchId) !== itemBranchId) {
      setConflictState({
        isOpen: true,
        pendingItem: newItem,
      });
      return { conflict: true, existingBranchId: activeBranchId };
    }

    // Vendos degën dhe restorantin aktiv
    if (itemBranchId && (!activeBranchId || items.length === 0)) {
      setActiveBranchId(itemBranchId);
    }
    if (newItem.restaurant && (!activeRestaurant || items.length === 0)) {
      setActiveRestaurant(newItem.restaurant);
    }

    // Kontrollon nëse ky artikull me të njëjtat opsione ekziston tashmë
    const fingerprint = getProductFingerprint(newItem.product.id, newItem.selectedChoices);
    setItems((prevItems) => {
      const existingIdx = prevItems.findIndex(
        (it) => getProductFingerprint(it.product.id, it.selectedChoices) === fingerprint
      );

      if (existingIdx > -1) {
        const updated = [...prevItems];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + (newItem.quantity || 1),
        };
        return updated;
      }

      return [...prevItems, { ...newItem, fingerprint }];
    });

    // Hap automatikisht Cart Drawer për një përvojë të shkëlqyer përdoruesi
    setIsCartOpen(true);
    return { success: true };
  };

  /**
   * Zgjidh konfliktin e restoranteve:
   * nëse confirmed = true, pastron shportën e vjetër dhe shton artikullin e ri.
   */
  const resolveConflict = (confirmed) => {
    if (confirmed && conflictState.pendingItem) {
      const pending = conflictState.pendingItem;
      const newBranchId = pending.branchId ? String(pending.branchId) : null;
      setActiveBranchId(newBranchId);
      setActiveRestaurant(pending.restaurant || null);

      const fingerprint = getProductFingerprint(pending.product.id, pending.selectedChoices);
      setItems([{ ...pending, fingerprint }]);
      setIsCartOpen(true);
    }
    setConflictState({ isOpen: false, pendingItem: null });
  };

  /**
   * Përditëson sasinë e një artikulli sipas indeksit
   */
  const updateQuantity = (index, delta) => {
    setItems((prevItems) => {
      if (index < 0 || index >= prevItems.length) return prevItems;
      const target = prevItems[index];
      const newQty = (target.quantity || 1) + delta;

      if (newQty <= 0) {
        // Fshin artikullin nëse sasia zbret në 0
        const filtered = prevItems.filter((_, i) => i !== index);
        if (filtered.length === 0) {
          setActiveBranchId(null);
          setActiveRestaurant(null);
        }
        return filtered;
      }

      const updated = [...prevItems];
      updated[index] = { ...target, quantity: newQty };
      return updated;
    });
  };

  /**
   * Fshin një artikull specifik nga shporta
   */
  const removeItem = (index) => {
    setItems((prevItems) => {
      const filtered = prevItems.filter((_, i) => i !== index);
      if (filtered.length === 0) {
        setActiveBranchId(null);
        setActiveRestaurant(null);
      }
      return filtered;
    });
  };

  /**
   * Zbraz plotësisht shportën
   */
  const clearCart = () => {
    setItems([]);
    setActiveBranchId(null);
    setActiveRestaurant(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.ITEMS);
      localStorage.removeItem(STORAGE_KEYS.BRANCH_ID);
      localStorage.removeItem(STORAGE_KEYS.RESTAURANT);
    } catch (e) {
      console.error(e);
    }
  };

  // Llogaritjet e vlerave të shportës
  const totalItemsCount = items.reduce((sum, it) => sum + (it.quantity || 1), 0);

  const subtotal = items.reduce((sum, it) => {
    const itemPrice = parseFloat(it.unitPrice || it.finalPrice || it.product?.base_price || 0);
    const qty = it.quantity || 1;
    return sum + itemPrice * qty;
  }, 0);

  const deliveryFee = items.length > 0 ? 1.50 : 0.00;
  const grandTotal = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        totalItemsCount,
        subtotal: Number(subtotal.toFixed(2)),
        deliveryFee: Number(deliveryFee.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        activeBranchId,
        activeRestaurant,
        isCartOpen,
        conflictState,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        resolveConflict,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
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
