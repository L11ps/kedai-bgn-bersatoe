'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Header() {
  const { totalItems, setIsCartOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-[#0F2547]/95 backdrop-blur-md border-b border-[#9EC6E3]/25 shadow-md">
      <div className="max-w-[480px] mx-auto px-4 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-[#D4A843] shadow-md bg-[#0A1628] flex items-center justify-center transition-transform group-hover:scale-105">
            <Image
              src="/images/bgn-logo.png"
              alt="Logo Kedai BGN Bersatoe"
              width={40}
              height={40}
              className="object-contain w-full h-full p-0.5"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-[#FAF8F5] block leading-tight group-hover:text-[#D4A843] transition-colors">
                KEDAI BGN BERSATOE
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#D4A843]/20 text-[#D4A843] border border-[#D4A843]/40 shrink-0">
                EST. 1998
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#9EC6E3] leading-tight">
              Berasa Gurih &amp; Nikmat • Tel-U Jakarta
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Cart Trigger Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-[#D4A843] hover:bg-[#B8892A] text-[#0F2547] shadow-md active:scale-95 transition-all font-bold"
            aria-label="Buka Keranjang Pesanan"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#0F2547] text-[#D4A843] text-[10px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center ring-2 ring-[#D4A843]">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
