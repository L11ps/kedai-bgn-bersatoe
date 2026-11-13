'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, OrderType, CampusLocation, Product } from '@/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  selectedCampus: CampusLocation;
  setSelectedCampus: (campus: CampusLocation) => void;
  stockNotice: string | null;
  setStockNotice: (notice: string | null) => void;
  validateCartAgainstProducts: (products: Product[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'bgn_cart_items_v3';
const CAMPUS_KEY = 'bgn_campus_v3';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderType, setOrderTypeState] = useState<OrderType>('PO'); // Default PO (Min H-1)
  const [selectedCampus, setSelectedCampusState] = useState<CampusLocation>('Kampus B Halimun');
  const [stockNotice, setStockNotice] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem(CART_STORAGE_KEY);
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      }
      const savedCampus = localStorage.getItem(CAMPUS_KEY);
      if (
        savedCampus === 'Kampus B Halimun' ||
        savedCampus === 'Kampus C Minangkabau'
      ) {
        setSelectedCampusState(savedCampus as CampusLocation);
      }
    } catch (err) {
      console.warn('Failed to load cart from localStorage:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.warn('Failed to save cart to localStorage:', err);
      }
    }
  }, [items, isLoaded]);

  const setOrderType = (type: OrderType) => {
    setOrderTypeState(type);
  };

  const setSelectedCampus = (campus: CampusLocation) => {
    setSelectedCampusState(campus);
    try {
      localStorage.setItem(CAMPUS_KEY, campus);
    } catch {
      // ignore
    }
  };

  const addToCart = (newItem: Omit<CartItem, 'id'>) => {
    const lineId = newItem.product_id;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product_id === lineId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, { ...newItem, id: lineId }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const validateCartAgainstProducts = (products: Product[]) => {
    if (items.length === 0 || products.length === 0) return;

    let wasAdjusted = false;
    const adjustedItems: CartItem[] = [];

    items.forEach((item) => {
      const prod = products.find((p) => p.id === item.product_id);
      if (!prod || !prod.is_available) {
        wasAdjusted = true;
      } else {
        adjustedItems.push(item);
      }
    });

    if (wasAdjusted) {
      setItems(adjustedItems);
      setStockNotice('Beberapa menu disesuaikan karena ketersediaan.');
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        orderType,
        setOrderType,
        selectedCampus,
        setSelectedCampus,
        stockNotice,
        setStockNotice,
        validateCartAgainstProducts,
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
