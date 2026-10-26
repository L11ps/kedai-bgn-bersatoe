'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, OrderType, CampusLocation, Product } from '@/types';
import { getProductStockForCampus } from '@/lib/order-store';

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

const CART_STORAGE_KEY = 'bgn_cart_items_v2';
const ORDER_TYPE_KEY = 'bgn_order_type_v2';
const CAMPUS_KEY = 'bgn_campus_v2';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderType, setOrderTypeState] = useState<OrderType>('READY');
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
      const savedType = localStorage.getItem(ORDER_TYPE_KEY);
      if (savedType === 'READY' || savedType === 'PO') {
        setOrderTypeState(savedType);
      }
      const savedCampus = localStorage.getItem(CAMPUS_KEY);
      if (
        savedCampus === 'Kampus B Halimun' ||
        savedCampus === 'Kampus C Minangkabau' ||
        savedCampus === 'Kampus SB Daan Mogot'
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
    try {
      localStorage.setItem(ORDER_TYPE_KEY, type);
    } catch {
      // ignore
    }
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
    const optionsKey = JSON.stringify(newItem.selected_options);
    const lineId = `${newItem.product_id}_${optionsKey}_${newItem.special_notes.trim()}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === lineId);
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

  // Re-validate cart items if campus or orderType changed
  const validateCartAgainstProducts = (products: Product[]) => {
    if (items.length === 0 || products.length === 0) return;

    if (orderType === 'READY') {
      let wasAdjusted = false;
      const adjustedItems: CartItem[] = [];
      const messages: string[] = [];

      items.forEach((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        if (!prod) {
          wasAdjusted = true;
          return;
        }

        const available = getProductStockForCampus(prod, selectedCampus);
        if (available <= 0) {
          wasAdjusted = true;
          messages.push(`"${item.name}" dihapus dari keranjang karena stok habis di ${selectedCampus}.`);
        } else if (item.quantity > available) {
          wasAdjusted = true;
          messages.push(`Jumlah "${item.name}" disesuaikan menjadi ${available} porsi sesuai stok di ${selectedCampus}.`);
          adjustedItems.push({ ...item, quantity: available });
        } else {
          adjustedItems.push(item);
        }
      });

      if (wasAdjusted) {
        setItems(adjustedItems);
        setStockNotice(messages.join(' '));
      }
    } else if (orderType === 'PO') {
      let wasAdjusted = false;
      const adjustedItems: CartItem[] = [];
      const messages: string[] = [];

      items.forEach((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        if (prod && !prod.po_available) {
          wasAdjusted = true;
          messages.push(`"${item.name}" dihapus karena tidak tersedia untuk PO Besok.`);
        } else {
          adjustedItems.push(item);
        }
      });

      if (wasAdjusted) {
        setItems(adjustedItems);
        setStockNotice(messages.join(' '));
      }
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
