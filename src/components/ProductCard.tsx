'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Check, Clock, ShoppingBag } from 'lucide-react';
import { Product } from '@/types';
import { formatIDR } from '@/lib/formatters';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const isAvailable = product.is_available && product.po_available;
  const inCartItem = items.find((it) => it.product_id === product.id);
  const inCartQty = inCartItem?.quantity || 0;

  const handleAdd = () => {
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

  return (
    <div
      onClick={handleAdd}
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
                handleAdd();
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
  );
}
