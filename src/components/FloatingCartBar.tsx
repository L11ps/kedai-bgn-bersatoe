'use client';

import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatIDR } from '@/lib/formatters';

export default function FloatingCartBar() {
  const { totalItems, subtotal, setIsCartOpen, selectedCampus } = useCart();

  if (totalItems === 0) return null;

  const campusShort =
    selectedCampus === 'Kampus B Halimun' ? 'Halimun' : 'Minangkabau';

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 max-w-[480px] mx-auto px-4">
      <div
        onClick={() => setIsCartOpen(true)}
        className="w-full bg-[#0F2547] text-[#FAF8F5] border border-[#D4A843]/50 rounded-2xl p-3 shadow-xl flex items-center justify-between cursor-pointer hover:bg-[#163566] transition-all active:scale-98"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-[#D4A843] flex items-center justify-center text-[#0F2547] shrink-0 shadow-sm font-bold">
            <ShoppingBag className="w-4.5 h-4.5" />
            <span className="absolute -top-1.5 -right-1.5 bg-[#0A1628] text-[#D4A843] text-[10px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center ring-2 ring-[#D4A843]">
              {totalItems}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[#FAF8F5]">{formatIDR(subtotal)}</span>
              <span className="text-[10px] text-[#9EC6E3]">({totalItems} porsi)</span>
            </div>
            <p className="text-[11px] text-[#9EC6E3]/90">
              Pre-Order &bull; {campusShort}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-[#D4A843]">
          <span>Lihat Pesanan</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
