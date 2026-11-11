'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Check, Clock, AlertCircle } from 'lucide-react';
import { Product, OrderType, CampusLocation } from '@/types';
import { formatIDR } from '@/lib/formatters';
import { getProductStockForCampus } from '@/lib/order-store';

interface ProductCardProps {
  product: Product;
  orderType: OrderType;
  selectedCampus: CampusLocation;
  onOpenCustomization: (product: Product) => void;
  onSwitchToPO?: () => void;
}

export default function ProductCard({
  product,
  orderType,
  selectedCampus,
  onOpenCustomization,
  onSwitchToPO,
}: ProductCardProps) {
  const stockForCampus = getProductStockForCampus(product, selectedCampus);
  const isReadyMode = orderType === 'READY';

  // Determine availability
  const isAvailable = isReadyMode ? stockForCampus > 0 : product.po_available;

  // Short campus name for compact badge
  const campusShort =
    selectedCampus === 'Kampus B Halimun'
      ? 'Kampus B'
      : selectedCampus === 'Kampus C Minangkabau'
      ? 'Kampus C'
      : 'Kampus SB';

  return (
    <div
      onClick={() => isAvailable && onOpenCustomization(product)}
      className={`group relative bg-white rounded-xl p-3 border border-slate-200 shadow-xs transition-all duration-200 ${
        isAvailable
          ? 'hover:border-slate-300 hover:shadow-sm cursor-pointer'
          : 'opacity-75 cursor-not-allowed bg-slate-50/60'
      }`}
    >
      {/* Product Image */}
      <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-slate-100 mb-2.5">
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className={`object-cover transition-transform duration-300 ${
            isAvailable ? 'group-hover:scale-102' : 'grayscale-50'
          }`}
          priority={product.slug === 'nasi-goreng-spesial-telur' || product.slug === 'spaghetti-bolognese-keju'}
        />

        {/* Stock / Availability Badge */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {isReadyMode ? (
            stockForCampus > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-emerald-700 shadow-xs backdrop-blur-xs border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Sisa {stockForCampus} di {campusShort}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/90 text-white shadow-xs backdrop-blur-xs">
                <AlertCircle className="w-3 h-3 text-slate-300" />
                <span>Habis Hari Ini</span>
              </span>
            )
          ) : product.po_available ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-blue-700 shadow-xs backdrop-blur-xs border border-blue-200">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>Tersedia PO Besok</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-200">
              PO Tutup
            </span>
          )}
        </div>
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
                onOpenCustomization(product);
              }}
              className="h-9 px-3 rounded-lg font-bold text-xs bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 flex items-center gap-1 shadow-xs transition-all active:scale-95 group-hover:border-[#D4A843]"
              aria-label={`Pesan ${product.name}`}
            >
              <Plus className="w-3.5 h-3.5 text-[#D4A843]" />
              <span>Pesan</span>
            </button>
          ) : isReadyMode && product.po_available && onSwitchToPO ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwitchToPO();
              }}
              className="h-8 px-2.5 rounded-lg text-[11px] font-semibold text-[#0F2547] bg-[#D4A843]/15 hover:bg-[#D4A843]/25 border border-[#D4A843]/40 transition-colors"
            >
              Pesan untuk PO Besok
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Tidak Tersedia</span>
          )}
        </div>
      </div>
    </div>
  );
}
