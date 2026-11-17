'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, Check, Clock, X, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { formatIDR } from '@/lib/formatters';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalQty, setModalQty] = useState(1);

  const hasVariants = Boolean(product.variants && product.variants.length > 0);

  // Default option initialization
  const initialOptions: Record<string, string> = {};
  if (hasVariants && product.variants) {
    product.variants.forEach((v) => {
      initialOptions[v.group_name] = v.options[0] || '';
    });
  }
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialOptions);

  const isAvailable = product.is_available && product.po_available;
  const inCartQty = items
    .filter((it) => it.product_id === product.id)
    .reduce((sum, it) => sum + it.quantity, 0);

  const handleCardClick = () => {
    if (!isAvailable) return;
    if (hasVariants) {
      setModalQty(1);
      setIsModalOpen(true);
    } else {
      handleAddDirect();
    }
  };

  const handleAddDirect = () => {
    if (!isAvailable) return;
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity: 1,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleConfirmVariantAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable) return;

    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity: modalQty,
      selected_options: selectedOptions,
    });

    setIsModalOpen(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`group relative bg-white rounded-2xl p-3 border border-slate-200 shadow-xs transition-all duration-200 ${
          isAvailable
            ? 'hover:border-[#0F2547]/30 hover:shadow-md cursor-pointer'
            : 'opacity-70 cursor-not-allowed bg-slate-50'
        }`}
      >
        {/* Product Image */}
        <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-2.5">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            className={`object-cover transition-transform duration-300 ${
              isAvailable ? 'group-hover:scale-103' : 'grayscale-50'
            }`}
            priority={product.slug === 'nasi-goreng-spesial-telur' || product.slug === 'spaghetti-bolognese-keju'}
          />

          {/* Availability Badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#0F2547] shadow-xs backdrop-blur-xs border border-[#9EC6E3]/50">
                <Clock className="w-3 h-3 text-[#D4A843]" />
                <span>Pre-Order</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/90 text-white shadow-xs backdrop-blur-xs">
                <span>Habis</span>
              </span>
            )}
          </div>

          {/* In Cart Indicator */}
          {inCartQty > 0 && (
            <div className="absolute top-2 right-2 pointer-events-none">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#D4A843] text-[#0F2547] font-black text-xs shadow-md border-2 border-white">
                {inCartQty}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-[#0F2547] transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price & Action Button */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div>
              <span className="text-sm font-extrabold text-[#0F2547]">
                {formatIDR(product.price)}
              </span>
            </div>

            {isAvailable ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasVariants) {
                    setModalQty(1);
                    setIsModalOpen(true);
                  } else {
                    handleAddDirect();
                  }
                }}
                className={`h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                  justAdded
                    ? 'bg-emerald-600 text-white border border-emerald-700'
                    : 'bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/60'
                }`}
                aria-label={`Pesan ${product.name}`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Masuk</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-[#D4A843]" />
                    <span>Pesan</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Tidak Tersedia</span>
            )}
          </div>
        </div>
      </div>

      {/* Modal Opsi Varian Pemesanan (Wajib Diisi untuk Jus Jeruk dll) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Pilih Varian Menu
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sesuaikan racikan pesanan Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ringkasan Produk */}
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-200">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-slate-900 truncate">
                  {product.name}
                </h4>
                <p className="text-xs font-black text-[#0F2547] mt-0.5">
                  {formatIDR(product.price)}
                </p>
              </div>
            </div>

            {/* Form Varian */}
            <form onSubmit={handleConfirmVariantAdd} className="space-y-4">
              {product.variants?.map((vGroup) => {
                const currentValue = selectedOptions[vGroup.group_name] || vGroup.options[0] || '';
                return (
                  <div key={vGroup.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        {vGroup.group_name}:
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Wajib Diisi
                      </span>
                    </div>

                    {/* Dropdown Selector */}
                    <div className="relative">
                      <select
                        value={currentValue}
                        onChange={(e) =>
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [vGroup.group_name]: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0F2547] focus:ring-2 focus:ring-[#D4A843]/20 shadow-xs appearance-none"
                      >
                        {vGroup.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>

                    {/* Pill Option Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {vGroup.options.map((opt) => {
                        const isSelected = currentValue === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [vGroup.group_name]: opt,
                              }))
                            }
                            className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition-all ${
                              isSelected
                                ? 'bg-[#0F2547] text-[#FAF8F5] border-[#0F2547] shadow-xs ring-2 ring-[#D4A843]/30'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Quantity Counter */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Jumlah Porsi:</span>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                    disabled={modalQty <= 1}
                    className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 shadow-xs flex items-center justify-center text-xs font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-xs text-slate-900">
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQty((q) => Math.min(50, q + 1))}
                    className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-50 shadow-xs flex items-center justify-center text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/60 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
              >
                <span>Tambahkan ({formatIDR(product.price * modalQty)})</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}