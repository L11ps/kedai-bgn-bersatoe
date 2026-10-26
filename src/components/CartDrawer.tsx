'use client';

import React from 'react';
import Link from 'next/link';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatIDR } from '@/lib/formatters';

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    totalItems,
    orderType,
    selectedCampus,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

      <div className="relative w-full max-w-[440px] h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0F2547] flex items-center justify-center text-[#D4A843]">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-extrabold text-sm text-[#0F2547]">
              Keranjang Pesanan ({totalItems})
            </h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Campus & Type Banner */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs flex items-center justify-between text-slate-600">
          <div>
            <span className="font-semibold text-slate-800">
              {orderType === 'READY' ? 'Ready Hari Ini' : 'Pre-Order Besok'}
            </span>
            <span className="text-slate-400"> • </span>
            <span>{selectedCampus}</span>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] text-red-600 hover:underline flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3 h-3" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Keranjang Masih Kosong</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih menu favorit Anda dari katalog untuk mulai memesan.
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">{item.name}</h4>
                    <span className="text-xs font-semibold text-slate-600">
                      {formatIDR(item.price)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Selected Options */}
                {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                  <div className="text-[11px] text-slate-500 flex flex-wrap gap-1">
                    {Object.entries(item.selected_options).map(([k, v]) => (
                      <span key={k} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}

                {/* Special Notes */}
                {item.special_notes && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    Catatan: &ldquo;{item.special_notes}&rdquo;
                  </p>
                )}

                {/* Quantity Controls & Subtotal */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs"
                      aria-label="Kurangi"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs"
                      aria-label="Tambah"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-extrabold text-xs text-slate-900">
                    {formatIDR(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Subtotal</span>
              <span className="text-base font-extrabold text-slate-900">
                {formatIDR(subtotal)}
              </span>
            </div>

            <Link
              href="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="w-full h-11 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/60 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <span>Lanjut ke Checkout</span>
              <ArrowRight className="w-4 h-4 text-[#D4A843]" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
