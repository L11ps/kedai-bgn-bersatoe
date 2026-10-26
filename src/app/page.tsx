'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CategoryTabs from '@/components/CategoryTabs';
import ProductCard from '@/components/ProductCard';
import CustomizationModal from '@/components/CustomizationModal';
import FloatingCartBar from '@/components/FloatingCartBar';
import CartDrawer from '@/components/CartDrawer';
import { Product, CampusLocation, OrderType } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import { useCart } from '@/context/CartContext';
import { MapPin, Sparkles, AlertCircle, X } from 'lucide-react';

const CATEGORIES = [
  'Semua',
  'Makanan Utama & Camilan',
  'Dessert & Minuman',
];

const CAMPUS_OPTIONS: CampusLocation[] = [
  'Kampus B Halimun',
  'Kampus C Minangkabau',
  'Kampus SB Daan Mogot',
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const {
    orderType,
    setOrderType,
    selectedCampus,
    setSelectedCampus,
    stockNotice,
    setStockNotice,
    validateCartAgainstProducts,
  } = useCart();

  // Fetch updated menu & stocks from API
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

  const handleOrderTypeChange = (newType: OrderType) => {
    setOrderType(newType);
    validateCartAgainstProducts(products);
  };

  const filteredProducts =
    activeCategory === 'Semua'
      ? products
      : products.filter((p) => p.category === activeCategory);

  const handleOpenCustomization = (product: Product) => {
    setSelectedProduct(product);
    setIsCustomizing(true);
  };

  return (
    <div className="min-h-screen bg-[#071324] sm:py-6 flex flex-col items-center justify-start antialiased text-slate-900 selection:bg-[#D4A843] selection:text-[#0F2547]">
      {/* Mobile-First Frame: 480px centered on Desktop */}
      <div className="w-full max-w-[480px] min-h-screen sm:min-h-[92vh] sm:rounded-3xl overflow-hidden bg-white flex flex-col shadow-2xl relative border-x border-slate-200/80 pb-24">
        {/* Top Header */}
        <Header />

        {/* Brand Banner with Emblem Heritage */}
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

        {/* Ordering Mode & Campus Controls Section */}
        <section className="p-4 bg-white border-b border-slate-200 space-y-3">
          {/* 1. Segmented Tab: Ready Hari Ini vs Pre-Order Besok */}
          <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 gap-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleOrderTypeChange('READY')}
              className={`h-10 rounded-lg text-xs font-bold transition-all ${
                orderType === 'READY'
                  ? 'bg-[#0F2547] text-[#FAF8F5] shadow-xs ring-1 ring-[#D4A843]/40'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Ready Hari Ini</span>
              <span className={`block text-[10px] font-normal ${orderType === 'READY' ? 'text-[#D4A843]' : 'text-slate-500'}`}>
                Stok langsung di kampus
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleOrderTypeChange('PO')}
              className={`h-10 rounded-lg text-xs font-bold transition-all ${
                orderType === 'PO'
                  ? 'bg-[#0F2547] text-[#FAF8F5] shadow-xs ring-1 ring-[#D4A843]/40'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pre-Order Besok</span>
              <span className={`block text-[10px] font-normal ${orderType === 'PO' ? 'text-[#D4A843]' : 'text-slate-500'}`}>
                Pesan untuk diantar besok
              </span>
            </button>
          </div>

          {/* 2. Campus Location Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0F2547]" />
                <span>Lokasi Kampus Tujuan</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {orderType === 'READY' ? 'Menampilkan stok kampus' : 'Titik antar besok'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {CAMPUS_OPTIONS.map((campus) => {
                const isSelected = selectedCampus === campus;
                const shortLabel =
                  campus === 'Kampus B Halimun'
                    ? 'Halimun'
                    : campus === 'Kampus C Minangkabau'
                    ? 'Minangkabau'
                    : 'Daan Mogot';

                return (
                  <button
                    key={campus}
                    type="button"
                    onClick={() => handleCampusChange(campus)}
                    className={`h-9 px-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#0F2547] text-[#FAF8F5] border border-[#D4A843] shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="truncate">{shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stock Notice Banner (e.g. if item quantity was adjusted upon campus switch) */}
          {stockNotice && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{stockNotice}</span>
              </div>
              <button
                onClick={() => setStockNotice(null)}
                className="text-amber-500 hover:text-amber-700 p-0.5"
                title="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* Category Filter Tabs */}
        <section className="py-2.5 sticky top-[57px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <CategoryTabs
            categories={CATEGORIES}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        </section>

        {/* Menu Catalog Section */}
        <main className="p-4 flex-1 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h2 className="font-extrabold text-sm text-slate-900">
              {activeCategory === 'Semua' ? 'Katalog Menu' : activeCategory}
            </h2>
            <span className="text-slate-500 font-medium">
              {filteredProducts.length} menu tersedia
            </span>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                orderType={orderType}
                selectedCampus={selectedCampus}
                onOpenCustomization={handleOpenCustomization}
                onSwitchToPO={() => handleOrderTypeChange('PO')}
              />
            ))}
          </div>
        </main>

        {/* Customization Modal */}
        <CustomizationModal
          product={selectedProduct}
          isOpen={isCustomizing}
          orderType={orderType}
          selectedCampus={selectedCampus}
          onClose={() => {
            setIsCustomizing(false);
            setSelectedProduct(null);
          }}
        />

        {/* Floating Bottom Cart Bar */}
        <FloatingCartBar />

        {/* Full Cart Drawer */}
        <CartDrawer />
      </div>
    </div>
  );
}
