'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CategoryTabs from '@/components/CategoryTabs';
import ProductCard from '@/components/ProductCard';
import FloatingCartBar from '@/components/FloatingCartBar';
import CartDrawer from '@/components/CartDrawer';
import { Product, CampusLocation } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import { useCart } from '@/context/CartContext';
import { MapPin, Clock, CalendarCheck } from 'lucide-react';

const CATEGORIES = [
  'Semua',
  'Makanan Utama & Camilan',
  'Dessert & Minuman',
];

const CAMPUS_OPTIONS: CampusLocation[] = [
  'Kampus B Halimun',
  'Kampus C Minangkabau',
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState('Semua');

  const {
    selectedCampus,
    setSelectedCampus,
    validateCartAgainstProducts,
  } = useCart();

  // Fetch updated menu from API
  useEffect(() => {
    fetch('/api/menu')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.products) {
          setProducts(data.products);
          validateCartAgainstProducts(data.products);
        }
      })
      .catch((err) => console.warn('Using default menu products:', err));
  }, []);

  const handleCampusChange = (newCampus: CampusLocation) => {
    setSelectedCampus(newCampus);
    validateCartAgainstProducts(products);
  };

  const filteredProducts =
    activeCategory === 'Semua'
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#071324] sm:py-6 flex flex-col items-center justify-start antialiased text-slate-900 selection:bg-[#D4A843] selection:text-[#0F2547]">
      {/* Mobile-First Frame: 480px centered on Desktop */}
      <div className="w-full max-w-[480px] min-h-screen sm:min-h-[92vh] sm:rounded-3xl overflow-hidden bg-white flex flex-col shadow-2xl relative border-x border-slate-200/80 pb-24">
        {/* Top Header */}
        <Header />

        {/* Brand Banner */}
        <section className="bg-gradient-to-r from-[#0F2547] via-[#163566] to-[#0A1628] text-white px-4 py-2.5 border-b border-[#9EC6E3]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4A843] animate-pulse" />
            <span className="text-xs font-bold text-[#FAF8F5]">
              Cita Rasa Gurih &amp; Nikmat Khas Kampus Tel-U
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#D4A843] bg-[#D4A843]/15 px-2 py-0.5 rounded border border-[#D4A843]/30">
            EST. 1998
          </span>
        </section>

        {/* PO System & Campus Controls Section */}
        <section className="p-4 bg-white border-b border-slate-200 space-y-3">
          {/* PO Information Badge */}
          <div className="bg-[#0F2547]/5 border border-[#0F2547]/15 rounded-2xl p-3 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#0F2547] text-[#D4A843] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#0F2547]">
                Sistem Pemesanan Pre-Order (PO Min H-1)
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                Pengantaran pesanan aktif setiap <strong>Senin s/d Jumat</strong> ke titik temu kampus yang Anda pilih.
              </p>
            </div>
          </div>

          {/* Campus Selector Chips (2 Kampus: Halimun & Minangkabau) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Pilih Lokasi Kampus Pengantaran:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CAMPUS_OPTIONS.map((c) => {
                const isSelected = selectedCampus === c;
                const short = c === 'Kampus B Halimun' ? 'Kampus Halimun' : 'Kampus Minangkabau';
                const code = c === 'Kampus B Halimun' ? 'Kampus B' : 'Kampus C';

                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCampusChange(c)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-left border flex items-center justify-between transition-all active:scale-97 ${
                      isSelected
                        ? 'bg-[#0F2547] text-white border-[#0F2547] shadow-md shadow-[#0F2547]/15 ring-2 ring-[#D4A843]/40'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className={`text-[10px] font-black uppercase tracking-wider block ${isSelected ? 'text-[#D4A843]' : 'text-slate-400'}`}>
                        {code}
                      </span>
                      <span className="font-bold text-xs truncate block">{short}</span>
                    </div>
                    <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#D4A843]' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Category Navigation Tabs */}
        <CategoryTabs
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {/* Product Catalog Grid */}
        <main className="p-4 flex-1">
          <div className="grid grid-cols-1 gap-3.5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </main>

        {/* Floating Cart Bar */}
        <FloatingCartBar />

        {/* Cart Drawer Slide-Over */}
        <CartDrawer />
      </div>
    </div>
  );
}
