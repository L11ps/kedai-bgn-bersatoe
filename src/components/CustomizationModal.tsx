'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { Product, OrderType, CampusLocation } from '@/types';
import { formatIDR } from '@/lib/formatters';
import { useCart } from '@/context/CartContext';

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
  onClose,
}: CustomizationModalProps) {
  const { addToCart } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [specialNotes, setSpecialNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);

  // Reset state when product opens
  useEffect(() => {
    if (product) {
      const initial: Record<string, string> = {};
      (product.variants || []).forEach((v) => {
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

  const variants = product.variants || [];
  const missingRequiredVariants = variants.filter(
    (v) => v.is_required && !selectedOptions[v.group_name]
  );
  const isValid = missingRequiredVariants.length === 0 && quantity > 0;

  const handleSelectOption = (groupName: string, option: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: option,
    }));
  };

  const handleAddToCart = () => {
    if (!isValid || !product) return;

    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity,
      selected_options: selectedOptions,
      special_notes: specialNotes.trim(),
    });

    setIsAddedSuccess(true);
    setTimeout(() => {
      setIsAddedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="relative h-44 w-full bg-slate-100 shrink-0">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-slate-700 flex items-center justify-center shadow-md hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">{product.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{product.description}</p>
            <span className="text-sm font-extrabold text-[#0F2547] mt-2 block">
              {formatIDR(product.price)}
            </span>
          </div>

          {variants.map((v) => (
            <div key={v.id} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">{v.group_name}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {v.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(v.group_name, opt)}
                    className={`p-2 rounded-xl text-xs font-semibold border text-left transition-colors ${
                      selectedOptions[v.group_name] === opt
                        ? 'bg-[#0F2547] text-white border-[#0F2547]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Special Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Sambal dipisah"
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-xs"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center font-bold text-xs">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isValid}
            className={`flex-1 h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              isAddedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0F2547] text-white hover:bg-[#163566]'
            }`}
          >
            {isAddedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Ditambahkan</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 text-[#D4A843]" />
                <span>Tambah {formatIDR(product.price * quantity)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
