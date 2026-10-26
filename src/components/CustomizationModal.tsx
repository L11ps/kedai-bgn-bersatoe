'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { Product, OrderType, CampusLocation } from '@/types';
import { formatIDR } from '@/lib/formatters';
import { useCart } from '@/context/CartContext';
import { getProductStockForCampus } from '@/lib/order-store';

interface CustomizationModalProps {
  product: Product | null;
  isOpen: boolean;
  orderType: OrderType;
  selectedCampus: CampusLocation;
  onClose: () => void;
}

export default function CustomizationModal({
  product,
  isOpen,
  orderType,
  selectedCampus,
  onClose,
}: CustomizationModalProps) {
  const { addToCart } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [specialNotes, setSpecialNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);

  // Calculate max allowed quantity based on orderType & campus stock
  const availableStock = product
    ? orderType === 'READY'
      ? getProductStockForCampus(product, selectedCampus)
      : 20
    : 0;

  // Reset state when product opens
  useEffect(() => {
    if (product) {
      const initial: Record<string, string> = {};
      product.variants.forEach((v) => {
        if (!v.is_required && v.options.length > 0) {
          initial[v.group_name] = v.options[0];
        }
      });
      setSelectedOptions(initial);
      setSpecialNotes('');
      setQuantity(1);
      setIsAddedSuccess(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  // Validation: Check if all required variants are selected
  const missingRequiredVariants = product.variants.filter(
    (v) => v.is_required && !selectedOptions[v.group_name]
  );
  const isValid = missingRequiredVariants.length === 0 && quantity > 0 && quantity <= availableStock;

  const handleSelectOption = (groupName: string, option: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: option,
    }));
  };

  const handleAddToCart = () => {
    if (!isValid) return;

    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity,
      selected_options: selectedOptions,
      special_notes: specialNotes.trim().slice(0, 100),
    });

    setIsAddedSuccess(true);
    setTimeout(() => {
      setIsAddedSuccess(false);
      onClose();
    }, 350);
  };

  const subtotal = product.price * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-[440px] max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden z-10 animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-200 flex items-center justify-between z-20">
          <div>
            <h2 className="font-bold text-sm text-slate-900 line-clamp-1">
              Kustomisasi Menu
            </h2>
            <p className="text-[11px] text-slate-500">
              {orderType === 'READY'
                ? `Ready Hari Ini di ${selectedCampus} (Maks ${availableStock} porsi)`
                : 'Pre-Order Besok'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Product Summary */}
          <div className="flex gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white">
              <Image src={product.image_url} alt={product.name} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-sm leading-tight">{product.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{product.description}</p>
              <div className="mt-1 text-xs font-extrabold text-slate-900">
                {formatIDR(product.price)}
              </div>
            </div>
          </div>

          {/* Variants */}
          {product.variants.map((variant) => {
            const currentSelected = selectedOptions[variant.group_name];
            return (
              <div key={variant.id || variant.group_name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      {variant.group_name}
                    </span>
                    {variant.is_required ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        Wajib
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Opsional
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {variant.options.map((option) => {
                    const isSelected = currentSelected === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSelectOption(variant.group_name, option)}
                        className={`h-10 px-3 rounded-lg text-xs font-semibold flex items-center justify-between text-left transition-all ${
                          isSelected
                            ? 'bg-[#0F2547] text-[#FAF8F5] border border-[#D4A843] shadow-xs font-bold'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <span className="truncate pr-1">{option}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-[#D4A843]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Notes (Max 100 chars) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="special-notes" className="font-bold text-xs text-slate-900">
                Catatan Khusus (Maks 100 karakter)
              </label>
              <span className="text-[10px] text-slate-400">
                {specialNotes.length}/100
              </span>
            </div>
            <textarea
              id="special-notes"
              rows={2}
              maxLength={100}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="Contoh: Sambal dipisah, jangan terlalu pedas..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#0F2547] focus:ring-1 focus:ring-[#D4A843]/40 text-slate-800 placeholder:text-slate-400 resize-none transition-colors"
            />
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="font-bold text-xs text-slate-900 block">Kuantitas</span>
              {orderType === 'READY' && (
                <span className="text-[10px] text-slate-500">Maksimal {availableStock} porsi</span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                aria-label="Kurangi kuantitas"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-xs text-slate-900">
                {quantity}
              </span>
              <button
                type="button"
                disabled={quantity >= availableStock}
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                aria-label="Tambah kuantitas"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 space-y-2 z-20">
          {!isValid && missingRequiredVariants.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Pilih opsi: {missingRequiredVariants.map((v) => v.group_name).join(', ')}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="min-w-[80px]">
              <span className="text-[10px] text-slate-500 block">Total</span>
              <span className="text-sm font-extrabold text-[#0F2547]">
                {formatIDR(subtotal)}
              </span>
            </div>

            <button
              type="button"
              disabled={!isValid || isAddedSuccess}
              onClick={handleAddToCart}
              className={`flex-1 h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                isValid
                  ? 'bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/60 shadow-md active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isAddedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#D4A843]" />
                  <span>Dimasukkan!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 text-[#D4A843]" />
                  <span>Tambah ke Keranjang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
