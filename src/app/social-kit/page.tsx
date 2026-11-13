'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCcw,
  Maximize2,
  X,
  MapPin,
  Clock,
  Layers,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Flame,
  CheckCircle2,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { Product, CampusLocation } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/products-data';

type FeedSlideIndex = 0 | 1 | 2;
type CampusFilter = 'ALL' | CampusLocation;

const CAMPUS_LIST: { id: CampusFilter; name: string; short: string }[] = [
  { id: 'ALL', name: 'Semua Kampus', short: 'Semua Kampus' },
  { id: 'Kampus B Halimun', name: 'Kampus B Halimun', short: 'Halimun' },
  { id: 'Kampus C Minangkabau', name: 'Kampus C Minangkabau', short: 'Minangkabau' },
];

export default function SocialKitPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'FEED' | 'STORIES' | 'CAPTIONS'>('ALL');
  const [feedSlide, setFeedSlide] = useState<FeedSlideIndex>(0);
  const [activeStory, setActiveStory] = useState<1 | 2>(1);
  const [campusFilter, setCampusFilter] = useState<CampusFilter>('ALL');
  const [fullscreenStory, setFullscreenStory] = useState<1 | 2 | null>(null);
  const [animKey, setAnimKey] = useState<number>(0);
  const [revealedTextIndex, setRevealedTextIndex] = useState<number>(0);
  const [showcaseIndex, setShowcaseIndex] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Animated text transitions for Story 1
  useEffect(() => {
    const textInterval = setInterval(() => {
      setRevealedTextIndex((prev) => (prev + 1) % 3);
    }, 2800);
    const showcaseInterval = setInterval(() => {
      setShowcaseIndex((prev) => (prev + 1) % 3);
    }, 3200);
    return () => {
      clearInterval(textInterval);
      clearInterval(showcaseInterval);
    };
  }, [animKey]);

  // Fetch real menu and stock data
  const fetchMenuData = useCallback(async () => {
    setIsLoadingMenu(true);
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } catch {
      // Fallback already INITIAL_PRODUCTS
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  // Copy handler with visual feedback
  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  // Calculate live campus stock for a product
  const getProductCampusStock = (p: Product, filter: CampusFilter): number => {
    return p.po_available ? 25 : 0;
  };

  // Total ready items count
  const totalReadyPortions = products.reduce((acc, p) => acc + getProductCampusStock(p, campusFilter), 0);

  // Captions text
  const instagramBioText = `KEDAI BGN BERSATOE 🍗✨
BGN BERSATOE • EST. 1998
Cita Rasa Gurih & Nikmat Khas Kampus Tel-U

📍 Lokasi Telkom University Jakarta:
• Kampus B Halimun
• Kampus C Minangkabau
• Kampus SB Daan Mogot

⏰ Jam Operasional: 07.00 - 17.00 WIB
⚡ Ready Stok Harian & Pre-Order Besok
🍗 Nasi Katsu Mentai, Nasi Katsu Sambal Matah & Dessert Segar
💳 Pembayaran Instan QRIS Bebas Antre

👇 Pesan Langsung Tanpa Antre:
kedai-bgn.my.id`;

  const grandOpeningCaptionText = `RESMI HADIR DI KAMPUS TELKOM UNIVERSITY JAKARTA! 🍗🎉

Kabar gembira buat seluruh mahasiswa & civitas akademika Tel-U Jakarta! KEDAI BGN BERSATOE (EST. 1998) sekarang resmi melayani pesan-antar & pickup langsung di 3 kampus:
📍 Kampus B Halimun
📍 Kampus C Minangkabau
📍 Kampus SB Daan Mogot

Gak ada lagi cerita kelaparan nunggu antrean panjang pas jam jeda kuliah! Semua menu disiapkan higienis, porsi mantap, dan rasa gurih nikmat:

🔥 MENU ANDALAN KEDAI BGN:
1. Nasi Goreng Spesial Telur: Rp15.000 (Wok hei gurih + telur mata sapi & kerupuk)
2. Spaghetti Bolognese Keju: Rp15.000 (Pasta al dente + saus daging & keju cheddar parut)
3. Jus Jeruk Segar: Rp10.000 (100% perasan jeruk asli murni botol 250ml)

📲 CARA PESAN PRAKTIS VIA WEB:
1. Kunjungi link di bio kami: @kedai.bgn_telyu
2. Pilih menu Ready Hari Ini atau Pre-Order Besok
3. Tentukan jam pengantaran fleksibel (07.00 - 17.00 WIB)
4. Bayar instan via QRIS, pesanan langsung kami siapkan!

Ajak teman sekelas dan pesan sekarang juga! 🚀

#KedaiBgnBersatoe #TelkomUniversityJakarta #AnakTelU #KulinerKampus #TelUHalimun #TelUMinangkabau #TelUDaanMogot #NasiGorengSpesial #SpaghettiBolognese #JusJeruk`;

  const dailyStoryCaptionText = `🔥 UPDATE STOK READY HARI INI DI KAMPUS TEL-U JAKARTA! 🔥

Buat kamu yang lagi jeda kelas, stok menu KEDAI BGN BERSATOE sudah ready di spot pickup kampus:
• Halimun: Ready
• Minangkabau: Ready
• Daan Mogot: Ready

Slot cepat habis setiap jam makan siang! Langsung amankan porsimu lewat link di bio sebelum kehabisan.
Bisa juga Pre-Order untuk besok pagi pukul 07.00 - 17.00 WIB.

👉 Tap link di stiker story / bio: @kedai.bgn_telyu`;

  // Download slide as high-res PNG via Canvas
  const handleDownloadSlide = (slideNum: FeedSlideIndex) => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Base background: #0F2547 (Royal Navy) or #FAF8F5 (Cream for Slide 2)
      if (slideNum === 1) {
        ctx.fillStyle = '#FAF8F5';
        ctx.fillRect(0, 0, 1080, 1350);

        // Header Navy banner
        ctx.fillStyle = '#0F2547';
        ctx.fillRect(0, 0, 1080, 240);

        // Header text
        ctx.fillStyle = '#D4A843';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BGN BERSATOE • EST. 1998', 540, 60);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px sans-serif';
        ctx.fillText('KATALOG MENU LENGKAP', 540, 130);

        ctx.fillStyle = '#9EC6E3';
        ctx.font = '24px sans-serif';
        ctx.fillText('Nikmat, Gurih, Porsi Kenyang Mahasiswa Tel-U Jakarta', 540, 185);

        // Draw 3 menu items grid placeholders
        const menuItems = [
          { name: 'Nasi Goreng Spesial', price: 'Rp15.000', note: 'Wok Hei & Telur Mata Sapi' },
          { name: 'Spaghetti Bolognese', price: 'Rp15.000', note: 'Pasta Al Dente & Keju' },
          { name: 'Jus Jeruk Segar', price: 'Rp10.000', note: '100% Buah Alami 250ml' },
        ];

        menuItems.forEach((item, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = col === 0 ? 70 : 560;
          const y = 280 + row * 310;

          // Card background
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(x, y, 450, 275, 20);
          ctx.fill();

          // Card border
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Card header pill
          ctx.fillStyle = '#0F2547';
          ctx.beginPath();
          ctx.roundRect(x + 25, y + 25, 400, 70, 12);
          ctx.fill();

          ctx.fillStyle = '#FAF8F5';
          ctx.font = 'bold 26px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(item.name, x + 40, y + 70);

          // Note
          ctx.fillStyle = '#64748B';
          ctx.font = '22px sans-serif';
          ctx.fillText(item.note, x + 35, y + 145);

          // Price Tag
          ctx.fillStyle = '#D4A843';
          ctx.beginPath();
          ctx.roundRect(x + 35, y + 175, 200, 55, 12);
          ctx.fill();

          ctx.fillStyle = '#0F2547';
          ctx.font = 'bold 28px sans-serif';
          ctx.fillText(item.price, x + 55, y + 213);
        });

        // Bottom footer banner
        ctx.fillStyle = '#0F2547';
        ctx.fillRect(0, 1230, 1080, 120);

        ctx.fillStyle = '#9EC6E3';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Porsi Kenyang Mahasiswa • Bebas Pilih Level Pedas & Varian', 540, 1285);
        ctx.fillStyle = '#FAF8F5';
        ctx.font = '20px sans-serif';
        ctx.fillText('@kedai.bgn_telyu • Halimun | Minangkabau | Daan Mogot', 540, 1320);

      } else if (slideNum === 0) {
        // Slide 1: Grand Opening Poster
        ctx.fillStyle = '#0F2547';
        ctx.fillRect(0, 0, 1080, 1350);

        // Elegant border
        ctx.strokeStyle = '#9EC6E3';
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, 1020, 1290);

        ctx.strokeStyle = '#D4A843';
        ctx.lineWidth = 2;
        ctx.strokeRect(45, 45, 990, 1260);

        // Header Badge
        ctx.fillStyle = '#D4A843';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BGN BERSATOE • EST. 1998', 540, 110);

        ctx.fillStyle = '#9EC6E3';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('@kedai.bgn_telyu', 540, 150);

        // Headline
        ctx.fillStyle = '#FAF8F5';
        ctx.font = '900 52px sans-serif';
        ctx.fillText('RESMI HADIR DI KAMPUS!', 540, 240);

        ctx.fillStyle = '#D4A843';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('BERASA GURIH & NIKMAT', 540, 300);

        // Hero Bento card
        ctx.fillStyle = '#163566';
        ctx.beginPath();
        ctx.roundRect(80, 350, 920, 580, 24);
        ctx.fill();
        ctx.strokeStyle = '#9EC6E3';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#FAF8F5';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('Menu Andalan Mahasiswa Tel-U:', 540, 420);

        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#9EC6E3';
        ctx.fillText('• Nasi Goreng Spesial Telur (Wok Hei & Telur Mata Sapi)', 540, 500);
        ctx.fillText('• Spaghetti Bolognese Keju (Pasta Daging Gurih & Keju)', 540, 570);
        ctx.fillText('• Jus Jeruk Segar (100% Buah Alami Murni Dingin)', 540, 640);

        // Price badge
        ctx.fillStyle = '#D4A843';
        ctx.beginPath();
        ctx.roundRect(290, 740, 500, 80, 20);
        ctx.fill();

        ctx.fillStyle = '#0F2547';
        ctx.font = '900 34px sans-serif';
        ctx.fillText('Mulai Rp10.000 - Rp15.000', 540, 792);

        // Campus Bar Info
        ctx.fillStyle = '#0B1C36';
        ctx.beginPath();
        ctx.roundRect(80, 970, 920, 200, 20);
        ctx.fill();
        ctx.strokeStyle = '#D4A843';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#FAF8F5';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('3 LOKASI KAMPUS TELKOM UNIVERSITY JAKARTA', 540, 1025);

        ctx.fillStyle = '#9EC6E3';
        ctx.font = '24px sans-serif';
        ctx.fillText('Kampus B Halimun • Kampus C Minangkabau • Kampus SB Daan Mogot', 540, 1075);

        ctx.fillStyle = '#D4A843';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('Jam Operasional: 07.00 - 17.00 WIB • Ready Harian & Pre-Order', 540, 1125);

        // Footer CTA
        ctx.fillStyle = '#FAF8F5';
        ctx.font = '22px sans-serif';
        ctx.fillText('Pesan Cepat Bebas Antre Melalui Web Resmi Kami', 540, 1270);

      } else {
        // Slide 3: Panduan Cara Pesan
        ctx.fillStyle = '#0F2547';
        ctx.fillRect(0, 0, 1080, 1350);

        // Borders
        ctx.strokeStyle = '#9EC6E3';
        ctx.lineWidth = 3;
        ctx.strokeRect(35, 35, 1010, 1280);

        // Header
        ctx.fillStyle = '#D4A843';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BGN BERSATOE • EST. 1998', 540, 100);

        ctx.fillStyle = '#FAF8F5';
        ctx.font = '900 48px sans-serif';
        ctx.fillText('CARA PESAN DI WEB KEDAI BGN', 540, 170);

        ctx.fillStyle = '#9EC6E3';
        ctx.font = '26px sans-serif';
        ctx.fillText('Praktis Tanpa Antre • Ambil atau Diantar Sesuai Jadwal Kuliah', 540, 220);

        // 3 Steps Cards
        const steps = [
          {
            num: '1',
            title: 'Pilih Mode & Kampus',
            desc: 'Cek stok Ready Hari Ini di kampusmu atau pilih Pre-Order untuk besok.',
            sub: 'Halimun • Minangkabau • Daan Mogot',
          },
          {
            num: '2',
            title: 'Atur Jam Fleksibel',
            desc: 'Bebas tentukan waktu pengantaran atau pickup pas jeda antar kuliah.',
            sub: 'Pukul 07.00 s/d 17.00 WIB',
          },
          {
            num: '3',
            title: 'Bayar Instan via QRIS',
            desc: 'Scan QRIS dari GoPay, OVO, Dana, ShopeePay, atau BCA. Notifikasi via WA.',
            sub: 'Pesanan Langsung Diproses Cepat!',
          },
        ];

        steps.forEach((st, idx) => {
          const y = 300 + idx * 260;

          // Card Background
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(90, y, 900, 220, 20);
          ctx.fill();

          // Step Number Badge
          ctx.fillStyle = '#0F2547';
          ctx.beginPath();
          ctx.roundRect(120, y + 35, 75, 75, 16);
          ctx.fill();

          ctx.fillStyle = '#D4A843';
          ctx.font = '900 38px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(st.num, 157, y + 87);

          // Step Title
          ctx.fillStyle = '#0F2547';
          ctx.font = '900 32px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(st.title, 220, y + 75);

          // Step Desc
          ctx.fillStyle = '#334155';
          ctx.font = '24px sans-serif';
          ctx.fillText(st.desc, 220, y + 125);

          // Step Sub
          ctx.fillStyle = '#D4A843';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(st.sub, 220, y + 175);
        });

        // Bottom QRIS Info Card
        ctx.fillStyle = '#163566';
        ctx.beginPath();
        ctx.roundRect(90, 1100, 900, 160, 20);
        ctx.fill();
        ctx.strokeStyle = '#D4A843';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#FAF8F5';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Scan QRIS Semua Bank & E-Wallet • Bebas Biaya Admin', 540, 1160);

        ctx.fillStyle = '#9EC6E3';
        ctx.font = '24px sans-serif';
        ctx.fillText('Link Akses Web di Bio Instagram: @kedai.bgn_telyu', 540, 1215);
      }

      // Convert to download link
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `bgn-social-feed-slide-${slideNum + 1}.png`;
      a.click();
    } catch {
      // Export handled
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-[#FAF8F5] antialiased selection:bg-[#D4A843] selection:text-[#0F2547]">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-30 bg-[#0F2547]/95 backdrop-blur-md border-b border-[#9EC6E3]/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF8F5] text-xs font-bold transition-colors border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </Link>

            <div className="h-5 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#D4A843] flex items-center justify-center text-[#0F2547] font-black text-xs shadow-md">
                BGN
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-tight text-[#FAF8F5]">
                    Instagram Media & Animated Studio
                  </span>
                  <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D4A843]/20 text-[#D4A843] border border-[#D4A843]/40">
                    BGN BERSATOE • EST. 1998
                  </span>
                </div>
                <div className="text-[11px] text-[#9EC6E3] font-medium">
                  Official Asset Studio for @kedai.bgn_telyu
                </div>
              </div>
            </div>
          </div>

          {/* Quick tab switcher */}
          <nav className="flex items-center bg-[#071324] p-1 rounded-xl border border-white/10 text-xs font-bold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ALL'
                  ? 'bg-[#D4A843] text-[#0F2547] shadow-md'
                  : 'text-[#9EC6E3] hover:text-[#FAF8F5]'
              }`}
            >
              Semua Kit
            </button>
            <button
              onClick={() => setActiveTab('FEED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'FEED'
                  ? 'bg-[#D4A843] text-[#0F2547] shadow-md'
                  : 'text-[#9EC6E3] hover:text-[#FAF8F5]'
              }`}
            >
              Feed 4:5 (3 Slide)
            </button>
            <button
              onClick={() => setActiveTab('STORIES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'STORIES'
                  ? 'bg-[#D4A843] text-[#0F2547] shadow-md'
                  : 'text-[#9EC6E3] hover:text-[#FAF8F5]'
              }`}
            >
              Animated Story 9:16
            </button>
            <button
              onClick={() => setActiveTab('CAPTIONS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'CAPTIONS'
                  ? 'bg-[#D4A843] text-[#0F2547] shadow-md'
                  : 'text-[#9EC6E3] hover:text-[#FAF8F5]'
              }`}
            >
              Bio & Caption
            </button>
          </nav>
        </div>
      </header>

      {/* ── Brand Identity Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F2547] to-[#0A1628] border-b border-[#9EC6E3]/20 py-8 px-4 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(#D4A843_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9EC6E3]/15 text-[#9EC6E3] text-xs font-bold border border-[#9EC6E3]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A843]" />
              Identitas Resmi Brand Emblem BGN Bersatoe Est. 1998
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#FAF8F5]">
              Studio Materi Promosi Instagram Resmi
            </h1>
            <p className="text-sm text-[#9EC6E3] max-w-2xl leading-relaxed">
              Dirancang khusus dengan palet warna resmi Royal Navy, Heritage Sky Blue, dan Warm Gold.
              Dilengkapi kanvas Feed 4:5 siap unduh, Story 9:16 beranimasi penuh, serta panel bio dan caption siap salin.
            </p>
          </div>

          {/* Color palette visual chips */}
          <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-[#071324]/80 border border-[#9EC6E3]/20 shadow-inner">
            <div className="text-[11px] font-bold text-[#9EC6E3] uppercase tracking-wider mr-1">
              Palet:
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-[#0F2547] px-2.5 py-1 rounded-lg border border-white/10 text-white">
              <span className="w-3 h-3 rounded-full bg-[#0F2547] ring-1 ring-white/30" />
              #0F2547
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-[#0F2547] px-2.5 py-1 rounded-lg border border-white/10 text-[#9EC6E3]">
              <span className="w-3 h-3 rounded-full bg-[#9EC6E3]" />
              #9EC6E3
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-[#0F2547] px-2.5 py-1 rounded-lg border border-white/10 text-[#D4A843]">
              <span className="w-3 h-3 rounded-full bg-[#D4A843]" />
              #D4A843
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-[#0F2547] px-2.5 py-1 rounded-lg border border-white/10 text-[#FAF8F5]">
              <span className="w-3 h-3 rounded-full bg-[#FAF8F5]" />
              #FAF8F5
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Studio Workspace ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ══════════════════════════════════════════════════════
            BAGIAN A: FEED INSTAGRAM GRAND OPENING (3 SLIDE 4:5)
        ══════════════════════════════════════════════════════ */}
        {(activeTab === 'ALL' || activeTab === 'FEED') && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#D4A843] uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  Bagian A: Feed Instagram Grand Opening
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#FAF8F5]">
                  Carousel 3 Slide (Rasio 4:5 Portrait / 1080x1350px)
                </h2>
                <p className="text-xs sm:text-sm text-[#9EC6E3]">
                  Desain presisi sesuai proporsi Feed Instagram. Gunakan tombol download untuk mengunduh gambar resolusi tinggi.
                </p>
              </div>

              {/* Slide Selector Buttons */}
              <div className="flex items-center gap-1.5 bg-[#0F2547] p-1.5 rounded-2xl border border-[#9EC6E3]/30">
                {(
                  [
                    { idx: 0, label: 'Slide 1: Poster Grand Opening' },
                    { idx: 1, label: 'Slide 2: Katalog 6 Menu' },
                    { idx: 2, label: 'Slide 3: Panduan Pesan Web' },
                  ] as { idx: FeedSlideIndex; label: string }[]
                ).map((s) => (
                  <button
                    key={s.idx}
                    onClick={() => setFeedSlide(s.idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      feedSlide === s.idx
                        ? 'bg-[#D4A843] text-[#0F2547] shadow-md'
                        : 'text-[#9EC6E3] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed Canvases Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Interactive Preview Canvas */}
              <div className="lg:col-span-7 flex flex-col items-center">
                {/* 4:5 Canvas Wrapper (Scaled for display) */}
                <div className="w-full max-w-[440px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-[#0F2547] ring-2 ring-[#D4A843]/40 bg-[#0F2547] relative flex flex-col transition-all duration-300">

                  {/* ── SLIDE 1: POSTER GRAND OPENING ── */}
                  {feedSlide === 0 && (
                    <div className="relative w-full h-full p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-b from-[#0F2547] via-[#122b52] to-[#0A1628] text-[#FAF8F5]">
                      {/* Decorative Borders */}
                      <div className="absolute inset-2.5 rounded-2xl border border-[#9EC6E3]/40 pointer-events-none" />
                      <div className="absolute inset-4 rounded-xl border border-[#D4A843]/40 pointer-events-none" />

                      {/* Slide 1 Header */}
                      <div className="relative z-10 text-center space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A843]/20 border border-[#D4A843]/50 text-[#D4A843] text-[11px] font-black tracking-wider uppercase">
                          <Sparkles className="w-3 h-3" />
                          BGN BERSATOE • EST. 1998
                        </div>
                        <div className="text-[11px] font-bold text-[#9EC6E3] tracking-wide">
                          @kedai.bgn_telyu
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black leading-tight text-[#FAF8F5] tracking-tight pt-1">
                          RESMI HADIR DI KAMPUS!
                        </h3>
                        <p className="text-xs sm:text-sm font-bold text-[#D4A843] tracking-wide">
                          BERASA GURIH & NIKMAT
                        </p>
                      </div>

                      {/* Visual Bento 3 Menus */}
                      <div className="relative z-10 my-auto py-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Bento Hero Item 1 */}
                          <div className="col-span-2 relative rounded-2xl overflow-hidden border border-[#9EC6E3]/30 bg-[#0F2547]/80 shadow-md flex items-center p-2.5 gap-3">
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/20">
                              <Image
                                src="/images/nasi_goreng_spesial_telur.jpg"
                                alt="Nasi Goreng Spesial Telur"
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9EC6E3]">
                                Signature Dish
                              </div>
                              <div className="text-xs font-black text-[#FAF8F5] truncate">
                                Nasi Goreng Spesial Telur
                              </div>
                              <div className="text-[11px] text-slate-300 line-clamp-1">
                                Wok hei gurih + telur mata sapi & kerupuk
                              </div>
                              <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#D4A843] text-[#0F2547] text-[11px] font-black">
                                Rp15.000
                              </div>
                            </div>
                          </div>

                          {/* Bento Sub Item 2 */}
                          <div className="relative rounded-2xl overflow-hidden border border-[#9EC6E3]/30 bg-[#0F2547]/80 shadow-md p-2 flex flex-col justify-between">
                            <div className="relative w-full h-20 rounded-xl overflow-hidden border border-white/20 mb-1.5">
                              <Image
                                src="/images/spaghetti_bolognese_keju.jpg"
                                alt="Spaghetti Bolognese Keju"
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="text-[11px] font-extrabold text-[#FAF8F5] truncate">
                                Spaghetti Bolognese Keju
                              </div>
                              <div className="text-[10px] text-[#9EC6E3] font-bold">
                                Rp15.000
                              </div>
                            </div>
                          </div>

                          {/* Bento Sub Item 3 */}
                          <div className="relative rounded-2xl overflow-hidden border border-[#9EC6E3]/30 bg-[#0F2547]/80 shadow-md p-2 flex flex-col justify-between">
                            <div className="relative w-full h-20 rounded-xl overflow-hidden border border-white/20 mb-1.5">
                              <Image
                                src="/images/jus_jeruk_segar.jpg"
                                alt="Jus Jeruk Segar"
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="text-[11px] font-extrabold text-[#FAF8F5] truncate">
                                Jus Jeruk Segar
                              </div>
                              <div className="text-[10px] text-[#9EC6E3] font-bold">
                                Rp10.000
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Price Range Pill */}
                        <div className="text-center pt-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#D4A843] to-[#F59E0B] text-[#0F2547] font-black text-xs shadow-md">
                            Mulai Rp10.000 - Rp15.000 • Porsi Puas
                          </span>
                        </div>
                      </div>

                      {/* Slide 1 Footer: 3 Campus Locations */}
                      <div className="relative z-10 rounded-2xl bg-[#071324]/90 p-3 border border-[#D4A843]/30 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black tracking-wider text-[#D4A843] uppercase">
                          <MapPin className="w-3 h-3 text-[#D4A843]" />
                          Tersedia di 3 Kampus Tel-U Jakarta:
                        </div>
                        <div className="text-[11px] font-bold text-[#FAF8F5]">
                          Kampus B Halimun • Kampus C Minangkabau • Kampus SB Daan Mogot
                        </div>
                        <div className="flex items-center justify-center gap-1 text-[10px] text-[#9EC6E3] pt-0.5">
                          <Clock className="w-3 h-3 text-[#9EC6E3]" />
                          Jam Operasional: 07.00 - 17.00 WIB
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── SLIDE 2: KATALOG MENU LENGKAP (6 MENU) ── */}
                  {feedSlide === 1 && (
                    <div className="relative w-full h-full flex flex-col justify-between bg-[#FAF8F5] text-slate-900">
                      {/* Top Header Card */}
                      <div className="bg-[#0F2547] p-4 text-center text-[#FAF8F5] border-b-2 border-[#D4A843]">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#D4A843]">
                          BGN BERSATOE • EST. 1998
                        </div>
                        <h3 className="text-base sm:text-lg font-black tracking-tight text-[#FAF8F5]">
                          KATALOG MENU LENGKAP
                        </h3>
                        <p className="text-[11px] text-[#9EC6E3]">
                          Nikmat & Gurih Khusus Mahasiswa Tel-U Jakarta
                        </p>
                      </div>

                      {/* 6 Dishes Grid */}
                      <div className="p-3.5 sm:p-4 grid grid-cols-2 gap-2.5 my-auto">
                        {INITIAL_PRODUCTS.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm flex items-center gap-2 hover:border-[#D4A843] transition-colors"
                          >
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-bold text-[#0F2547] truncate leading-tight">
                                {item.name}
                              </div>
                              <div className="text-[10px] font-black text-[#D4A843]">
                                Rp{item.price.toLocaleString('id-ID')}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate">
                                {item.slug.includes('katsu')
                                  ? 'Ayam Krispi Gurih'
                                  : item.slug.includes('pangsit')
                                  ? 'Chili Oil Aromatik'
                                  : 'Manis & Segar'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Slide 2 Footer Banner */}
                      <div className="bg-[#0F2547] text-[#FAF8F5] p-3 text-center border-t border-[#9EC6E3]/30 space-y-0.5">
                        <div className="text-[11px] font-black text-[#9EC6E3]">
                          Porsi Kenyang Mahasiswa • Bebas Pilih Level Pedas & Varian
                        </div>
                        <div className="text-[10px] text-slate-300">
                          Order Cepat via Web: @kedai.bgn_telyu
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── SLIDE 3: PANDUAN CARA PESAN WEB ── */}
                  {feedSlide === 2 && (
                    <div className="relative w-full h-full p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-b from-[#0F2547] via-[#122b52] to-[#0A1628] text-[#FAF8F5]">
                      {/* Decorative Borders */}
                      <div className="absolute inset-2.5 rounded-2xl border border-[#9EC6E3]/30 pointer-events-none" />

                      {/* Header */}
                      <div className="relative z-10 text-center space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A843]/20 border border-[#D4A843]/40 text-[#D4A843] text-[10px] font-black uppercase tracking-wider">
                          BGN BERSATOE • EST. 1998
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-[#FAF8F5]">
                          PANDUAN CARA PESAN DI WEB
                        </h3>
                        <p className="text-xs text-[#9EC6E3]">
                          Ready Hari Ini & Pre-Order Besok Bebas Antre
                        </p>
                      </div>

                      {/* 3 Steps Cards */}
                      <div className="relative z-10 space-y-2.5 my-auto">
                        {/* Step 1 */}
                        <div className="bg-[#FAF8F5] text-slate-900 rounded-2xl p-3 border border-white/20 shadow-md flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#0F2547] text-[#D4A843] flex items-center justify-center font-black text-sm shrink-0">
                            1
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-[#0F2547]">
                              Pilih Mode & Kampus
                            </div>
                            <div className="text-[11px] text-slate-600 leading-tight">
                              Cek stok Ready Hari Ini di kampusmu atau Pre-Order untuk besok.
                            </div>
                            <div className="text-[10px] font-bold text-[#D4A843] pt-0.5">
                              Halimun • Minangkabau • Daan Mogot
                            </div>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-[#FAF8F5] text-slate-900 rounded-2xl p-3 border border-white/20 shadow-md flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#0F2547] text-[#D4A843] flex items-center justify-center font-black text-sm shrink-0">
                            2
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-[#0F2547]">
                              Atur Jam Fleksibel
                            </div>
                            <div className="text-[11px] text-slate-600 leading-tight">
                              Bebas pilih jam pengantaran atau pickup pas jeda kuliah.
                            </div>
                            <div className="text-[10px] font-bold text-[#D4A843] pt-0.5">
                              Operasional: 07.00 - 17.00 WIB
                            </div>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-[#FAF8F5] text-slate-900 rounded-2xl p-3 border border-white/20 shadow-md flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#0F2547] text-[#D4A843] flex items-center justify-center font-black text-sm shrink-0">
                            3
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-[#0F2547]">
                              Bayar Instan via QRIS
                            </div>
                            <div className="text-[11px] text-slate-600 leading-tight">
                              Tanpa antre! Pesanan langsung disiapkan & notifikasi masuk via WA.
                            </div>
                            <div className="text-[10px] font-bold text-[#D4A843] pt-0.5">
                              Scan Semua E-Wallet & M-Banking
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Badge */}
                      <div className="relative z-10 rounded-2xl bg-[#071324]/90 p-3 border border-[#9EC6E3]/30 text-center space-y-0.5">
                        <div className="text-xs font-black text-[#D4A843]">
                          🔗 Akses Web Resmi di Bio: @kedai.bgn_telyu
                        </div>
                        <div className="text-[10px] text-[#9EC6E3]">
                          Praktis, Cepat, Tanpa Antre di Kantin Kampus
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Indicator Dot at Bottom */}
                  <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
                    <span
                      className={`w-2 h-2 rounded-full transition-all ${
                        feedSlide === 0 ? 'bg-[#D4A843] w-5' : 'bg-white/40'
                      }`}
                    />
                    <span
                      className={`w-2 h-2 rounded-full transition-all ${
                        feedSlide === 1 ? 'bg-[#D4A843] w-5' : 'bg-white/40'
                      }`}
                    />
                    <span
                      className={`w-2 h-2 rounded-full transition-all ${
                        feedSlide === 2 ? 'bg-[#D4A843] w-5' : 'bg-white/40'
                      }`}
                    />
                  </div>
                </div>

                {/* Canvas Controls */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => handleDownloadSlide(feedSlide)}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A843] to-[#F59E0B] text-[#0F2547] text-xs font-black shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Memproses File...' : `Download Slide ${feedSlide + 1} (PNG High-Res)`}
                  </button>

                  <button
                    onClick={() => setFeedSlide((prev) => ((prev + 1) % 3) as FeedSlideIndex)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0F2547] text-[#9EC6E3] hover:text-white text-xs font-bold border border-white/10 transition-colors"
                  >
                    Slide Berikutnya
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slide Detail & Instructions */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-3xl bg-[#0F2547]/60 border border-[#9EC6E3]/20 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#D4A843] uppercase tracking-wider">
                      Detail Slide {feedSlide + 1}
                    </span>
                    <span className="text-xs text-[#9EC6E3] font-mono">1080 x 1350 px (4:5)</span>
                  </div>

                  <h3 className="text-lg font-black text-[#FAF8F5]">
                    {feedSlide === 0 && 'Slide 1: Poster Grand Opening Resmi Tel-U'}
                    {feedSlide === 1 && 'Slide 2: Katalog 6 Menu Hidangan & Harga Lengkap'}
                    {feedSlide === 2 && 'Slide 3: Panduan 3 Langkah Memesan di Web'}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {feedSlide === 0 &&
                      'Menampilkan pengumuman resmi pembukaan KEDAI BGN BERSATOE di 3 kampus Telkom University Jakarta, menonjolkan 3 menu favorit dengan badge harga Rp12rb - Rp15rb dan jam operasional.'}
                    {feedSlide === 1 &&
                      'Menampilkan 6 foto menu lengkap dengan harga transparan dan label kategori. Desain kontras bersih dengan warna latar Cream #FAF8F5 dan aksen Navy #0F2547.'}
                    {feedSlide === 2 &&
                      'Menjelaskan proses pemesanan digital tanpa antre dengan 3 langkah mudah: Pilih Kampus & Mode, Tentukan Jam Fleksibel, dan Bayar Instan via QRIS.'}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                    <div className="text-[11px] font-bold text-[#9EC6E3] uppercase tracking-wider">
                      Spesifikasi Visual:
                    </div>
                    <ul className="space-y-1.5 text-slate-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />
                        <span>Rasio Gambar: 4:5 Portrait (Standar Feed Instagram)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />
                        <span>Resolusi Rekomendasi: 1080 x 1350 piksel</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />
                        <span>Emblem Resmi: BGN BERSATOE • EST. 1998</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />
                        <span>Tag Akun Resmi: @kedai.bgn_telyu</span>
                      </li>
                    </ul>
                  </div>

                  {/* Quick Export All 3 Slides */}
                  <div className="pt-3 border-t border-white/10">
                    <div className="text-xs font-bold text-[#FAF8F5] mb-2">
                      Unduh Satuan / Keseluruhan Slide:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleDownloadSlide(0)}
                        className="px-2 py-2 rounded-xl bg-[#071324] hover:bg-[#D4A843] hover:text-[#0F2547] text-xs font-bold border border-white/10 transition-colors text-center"
                      >
                        Slide 1
                      </button>
                      <button
                        onClick={() => handleDownloadSlide(1)}
                        className="px-2 py-2 rounded-xl bg-[#071324] hover:bg-[#D4A843] hover:text-[#0F2547] text-xs font-bold border border-white/10 transition-colors text-center"
                      >
                        Slide 2
                      </button>
                      <button
                        onClick={() => handleDownloadSlide(2)}
                        className="px-2 py-2 rounded-xl bg-[#071324] hover:bg-[#D4A843] hover:text-[#0F2547] text-xs font-bold border border-white/10 transition-colors text-center"
                      >
                        Slide 3
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            BAGIAN B: INSTAGRAM STORY BERANIMASI (RASIO 9:16)
        ══════════════════════════════════════════════════════ */}
        {(activeTab === 'ALL' || activeTab === 'STORIES') && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#D4A843] uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  Bagian B: Instagram Story Beranimasi
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#FAF8F5]">
                  Animated Story Studio (Rasio 9:16 Vertikal — 360x640px)
                </h2>
                <p className="text-xs sm:text-sm text-[#9EC6E3]">
                  Animasi CSS mulus looping untuk direkam langsung jadi video Story Instagram.
                </p>
              </div>

              {/* Story 1 & Story 2 Switcher */}
              <div className="flex items-center gap-2 bg-[#0F2547] p-1.5 rounded-2xl border border-[#9EC6E3]/30">
                <button
                  onClick={() => setActiveStory(1)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeStory === 1
                      ? 'bg-[#D4A843] text-[#0F2547] shadow-md'
                      : 'text-[#9EC6E3] hover:text-white'
                  }`}
                >
                  Story 1: Motion Showcase
                </button>
                <button
                  onClick={() => setActiveStory(2)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeStory === 2
                      ? 'bg-[#D4A843] text-[#0F2547] shadow-md'
                      : 'text-[#9EC6E3] hover:text-white'
                  }`}
                >
                  Story 2: Live Stock Kampus
                </button>
              </div>
            </div>

            {/* Story Control Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0F2547]/50 border border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnimKey((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF8F5] text-xs font-bold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#D4A843]" />
                  Putar Ulang Animasi
                </button>

                <button
                  onClick={() => setFullscreenStory(activeStory)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4A843] text-[#0F2547] hover:brightness-110 text-xs font-black shadow-md transition-all"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Mode Layar Penuh (Siap Screen Record)
                </button>
              </div>

              {/* Campus filter for Story 2 */}
              {activeStory === 2 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#9EC6E3] font-bold">Filter Kampus:</span>
                  <div className="flex items-center gap-1 bg-[#071324] p-1 rounded-xl border border-white/10">
                    {CAMPUS_LIST.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCampusFilter(c.id)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                          campusFilter === c.id
                            ? 'bg-[#D4A843] text-[#0F2547]'
                            : 'text-[#9EC6E3] hover:text-white'
                        }`}
                      >
                        {c.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stories Grid Display */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* 9:16 Story Frame */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <div
                  key={animKey}
                  className="w-[340px] sm:w-[360px] h-[600px] sm:h-[640px] rounded-[36px] overflow-hidden shadow-2xl border-[6px] border-[#071324] ring-2 ring-[#D4A843]/50 relative flex flex-col bg-[#0F2547] text-[#FAF8F5] select-none"
                >
                  {/* Instagram Story Top Chrome Simulation */}
                  <div className="absolute top-2 inset-x-3 z-30 space-y-2 pointer-events-none">
                    {/* Story progress bar */}
                    <div className="flex items-center gap-1">
                      <div className="h-1 flex-1 rounded-full bg-white/40 overflow-hidden">
                        <div className="h-full bg-white rounded-full animate-[progress_6s_linear_infinite]" />
                      </div>
                      <div className="h-1 flex-1 rounded-full bg-white/40" />
                    </div>

                    {/* Profile avatar & handle */}
                    <div className="flex items-center justify-between text-xs text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#D4A843] flex items-center justify-center text-[#0F2547] font-black text-[10px] ring-2 ring-white/60">
                          BGN
                        </div>
                        <div className="leading-tight">
                          <div className="font-bold flex items-center gap-1">
                            kedai.bgn_telyu
                            <CheckCircle2 className="w-3 h-3 text-[#D4A843]" />
                          </div>
                          <div className="text-[10px] text-white/70">1m ago • Tel-U Jakarta</div>
                        </div>
                      </div>
                      <div className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full border border-white/20">
                        Story Preview
                      </div>
                    </div>
                  </div>

                  {/* ── STORY 1: GRAND OPENING & FOOD SHOWCASE MOTION ── */}
                  {activeStory === 1 && (
                    <div className="relative w-full h-full flex flex-col justify-between pt-14 pb-4 px-4 bg-gradient-to-b from-[#0F2547] via-[#112d57] to-[#0A1628] overflow-hidden">
                      {/* Top Marquee Ticker */}
                      <div className="overflow-hidden bg-[#9EC6E3] text-[#0F2547] py-1 rounded-lg font-black text-[11px] tracking-wider uppercase shadow-md my-1">
                        <div className="whitespace-nowrap inline-block animate-[marquee_12s_linear_infinite]">
                          NOW OPEN • KEDAI BGN BERSATOE • HALIMUN • MINANGKABAU • DAAN MOGOT • NOW OPEN • KEDAI BGN BERSATOE • HALIMUN • MINANGKABAU • DAAN MOGOT •
                        </div>
                      </div>

                      {/* Emblem & Animated Text Reveal */}
                      <div className="text-center space-y-1.5 my-auto">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A843]/20 border border-[#D4A843] text-[#D4A843] text-[11px] font-black uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          BGN BERSATOE • EST. 1998
                        </div>

                        {/* Animated Text Reveal with smooth fade up */}
                        <div className="h-14 flex items-center justify-center">
                          {revealedTextIndex === 0 && (
                            <div className="animate-[fadeUp_0.6s_ease-out] text-lg sm:text-xl font-black text-[#FAF8F5]">
                              Laper Saat Jeda Kuliah?
                            </div>
                          )}
                          {revealedTextIndex === 1 && (
                            <div className="animate-[fadeUp_0.6s_ease-out] text-lg sm:text-xl font-black text-[#D4A843]">
                              Pesan Cepat Tanpa Antre!
                            </div>
                          )}
                          {revealedTextIndex === 2 && (
                            <div className="animate-[fadeUp_0.6s_ease-out] text-lg sm:text-xl font-black text-[#9EC6E3]">
                              Ready di Kampusmu Sekarang!
                            </div>
                          )}
                        </div>

                        {/* Floating Food Showcase Card with gentle bobbing animation */}
                        <div className="relative my-2">
                          <div className="animate-[floatCard_3.5s_ease-in-out_infinite] rounded-3xl bg-[#0F2547]/90 border-2 border-[#D4A843] shadow-2xl p-3 flex flex-col items-center">
                            <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-inner">
                              <Image
                                src={
                                  showcaseIndex === 0
                                    ? '/images/nasi_goreng_spesial_telur.jpg'
                                    : showcaseIndex === 1
                                    ? '/images/spaghetti_bolognese_keju.jpg'
                                    : '/images/jus_jeruk_segar.jpg'
                                }
                                alt="Highlight Menu"
                                fill
                                className="object-cover transition-all duration-700 hover:scale-105"
                              />
                            </div>
                            <div className="mt-2 text-center">
                              <div className="text-sm font-black text-[#FAF8F5]">
                                {showcaseIndex === 0 && 'Nasi Goreng Spesial Telur'}
                                {showcaseIndex === 1 && 'Spaghetti Bolognese Keju'}
                                {showcaseIndex === 2 && 'Jus Jeruk Segar'}
                              </div>
                              <div className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full bg-[#D4A843] text-[#0F2547] text-xs font-black shadow-md">
                                <Sparkles className="w-3 h-3 text-[#0F2547]" />
                                Rp10.000 - Rp15.000
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Instagram Link Sticker Zone with pulsing animation */}
                      <div className="space-y-2 mt-auto">
                        <div className="relative rounded-2xl border-2 border-dashed border-[#D4A843] bg-[#071324]/80 p-3 text-center animate-[pulse_2s_infinite]">
                          <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#D4A843]">
                            🔗 Klik Link Web di Sini / @kedai.bgn_telyu
                          </div>
                          <div className="text-[10px] text-[#9EC6E3] font-medium">
                            (Area Tempel Stiker Link Story Instagram)
                          </div>
                        </div>

                        {/* Bottom Marquee Ticker */}
                        <div className="overflow-hidden bg-[#9EC6E3] text-[#0F2547] py-1 rounded-lg font-black text-[11px] tracking-wider uppercase shadow-md">
                          <div className="whitespace-nowrap inline-block animate-[marquee_12s_linear_infinite_reverse]">
                            KEDAI BGN BERSATOE • PESAN SEKARANG • BEBAS ANTRE • TEL-U JAKARTA • KEDAI BGN BERSATOE • PESAN SEKARANG • BEBAS ANTRE • TEL-U JAKARTA •
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── STORY 2: LIVE UPDATE READY STOCK KAMPUS ── */}
                  {activeStory === 2 && (
                    <div className="relative w-full h-full flex flex-col justify-between pt-14 pb-4 px-4 bg-gradient-to-b from-[#0F2547] via-[#0E2240] to-[#0A1628] overflow-hidden">
                      {/* Live Stock Header Badge */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#071324]/90 border border-[#9EC6E3]/30">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                          </span>
                          <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                            LIVE UPDATE STOK HARI INI
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[#D4A843]">
                          {campusFilter === 'ALL' ? '3 Kampus' : campusFilter.replace('Kampus ', '')}
                        </span>
                      </div>

                      {/* Stock Summary Banner */}
                      <div className="text-center py-1">
                        <div className="text-xs font-bold text-[#9EC6E3]">
                          Total Porsi Siap Antar / Ambil:
                        </div>
                        <div className="text-2xl font-black text-[#D4A843]">
                          {totalReadyPortions} Porsi Tersedia
                        </div>
                      </div>

                      {/* Live Menu Stock List */}
                      <div className="space-y-1.5 my-auto max-h-[310px] overflow-y-auto pr-1">
                        {products.map((item) => {
                          const stockCount = getProductCampusStock(item, campusFilter);
                          const isReady = stockCount > 0;
                          return (
                            <div
                              key={item.id}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                isReady
                                  ? 'bg-[#0F2547]/80 border-[#9EC6E3]/30 hover:border-[#D4A843]'
                                  : 'bg-slate-900/60 border-slate-700 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/20">
                                  <Image
                                    src={item.image_url}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-[#FAF8F5] truncate leading-tight">
                                    {item.name}
                                  </div>
                                  <div className="text-[10px] text-[#9EC6E3]">
                                    Rp{item.price.toLocaleString('id-ID')}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                {isReady ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                                    Ready {stockCount}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                                    Habis Hari Ini
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Order Info & Link Sticker Area */}
                      <div className="space-y-2 mt-auto">
                        <div className="p-2.5 rounded-xl bg-[#071324] border border-[#D4A843]/40 text-center space-y-0.5">
                          <div className="text-[11px] font-black text-[#D4A843]">
                            OPEN PRE-ORDER BESOK (07.00 - 17.00 WIB)
                          </div>
                          <div className="text-[10px] text-slate-300">
                            Pesan sekarang untuk jam antar kuliah besok pagi!
                          </div>
                        </div>

                        {/* Interactive Link Sticker Area */}
                        <div className="rounded-xl border border-dashed border-[#9EC6E3] bg-[#0F2547]/90 p-2 text-center animate-[pulse_2s_infinite]">
                          <div className="text-[11px] font-black text-[#9EC6E3]">
                            🔗 Pesan Cepat Lewat Web: @kedai.bgn_telyu
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Story Instructions & Screen Recording Guide */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-3xl bg-[#0F2547]/60 border border-[#9EC6E3]/20 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#D4A843] uppercase tracking-wider">
                      Panduan Rekam Layar (Screen Record)
                    </span>
                    <span className="text-xs text-[#9EC6E3] font-mono">1080 x 1920 px (9:16)</span>
                  </div>

                  <h3 className="text-lg font-black text-[#FAF8F5]">
                    Cara Membuat Video Story Siap Upload ke Instagram
                  </h3>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#D4A843] text-[#0F2547] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <p>
                        Klik tombol <strong>"Mode Layar Penuh (Siap Screen Record)"</strong> di atas untuk menampilkan kanvas 9:16 tanpa elemen website lain.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#D4A843] text-[#0F2547] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <p>
                        Buka perekam layar HP atau gunakan <strong>Windows Snipping Tool (Win + Shift + R)</strong> / OBS untuk merekam area 9:16 selama 10-15 detik.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#D4A843] text-[#0F2547] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <p>
                        Upload video rekaman ke Story akun <strong>@kedai.bgn_telyu</strong>, lalu tempel <strong>Stiker Link Instagram</strong> tepat di atas kotak area yang sudah disediakan.
                      </p>
                    </div>
                  </div>

                  {/* Stock Connection Indicator */}
                  <div className="p-3.5 rounded-2xl bg-[#071324] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-[#FAF8F5] flex items-center gap-1.5">
                        <RefreshCw className={`w-3.5 h-3.5 text-[#D4A843] ${isLoadingMenu ? 'animate-spin' : ''}`} />
                        Sinkronisasi Stok Real-Time
                      </div>
                      <button
                        onClick={fetchMenuData}
                        className="text-[11px] font-bold text-[#9EC6E3] hover:text-white"
                      >
                        Perbarui Data
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Story 2 otomatis membaca stok dari database aplikasi. Ketika admin mengubah stok di dashboard admin, data stok di Story langsung menyesuaikan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            BAGIAN C: PANEL SALIN BIO & CAPTION SIAP PAKAI
        ══════════════════════════════════════════════════════ */}
        {(activeTab === 'ALL' || activeTab === 'CAPTIONS') && (
          <section className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#D4A843] uppercase tracking-wider">
                <Share2 className="w-4 h-4" />
                Bagian C: Teks Bio & Caption Siap Salin
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#FAF8F5]">
                Salin Bio Resmi & Caption Grand Opening
              </h2>
              <p className="text-xs sm:text-sm text-[#9EC6E3]">
                Tinggal klik tombol copy untuk langsung menyalin ke Instagram resmi @kedai.bgn_telyu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Instagram Bio */}
              <div className="rounded-3xl bg-[#0F2547]/70 border border-[#9EC6E3]/20 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#D4A843] uppercase tracking-wider">
                      Bio Akun Resmi Instagram
                    </span>
                    <span className="text-xs text-[#9EC6E3]">@kedai.bgn_telyu</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#071324] border border-white/10 text-xs font-mono text-slate-200 whitespace-pre-line leading-relaxed">
                    {instagramBioText}
                  </div>
                </div>

                <button
                  onClick={() => handleCopy('BIO', instagramBioText)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    copiedKey === 'BIO'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#D4A843] text-[#0F2547] hover:brightness-110 active:scale-95'
                  }`}
                >
                  {copiedKey === 'BIO' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Tersalin ke Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Salin Bio Instagram
                    </>
                  )}
                </button>
              </div>

              {/* Card 2: Grand Opening Carousel Caption */}
              <div className="rounded-3xl bg-[#0F2547]/70 border border-[#9EC6E3]/20 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#D4A843] uppercase tracking-wider">
                      Caption Feed Carousel 3 Slide
                    </span>
                    <span className="text-xs text-[#9EC6E3]">Postingan Grand Opening</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#071324] border border-white/10 text-xs font-mono text-slate-200 whitespace-pre-line leading-relaxed max-h-[320px] overflow-y-auto">
                    {grandOpeningCaptionText}
                  </div>
                </div>

                <button
                  onClick={() => handleCopy('CAPTION_FEED', grandOpeningCaptionText)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    copiedKey === 'CAPTION_FEED'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#D4A843] text-[#0F2547] hover:brightness-110 active:scale-95'
                  }`}
                >
                  {copiedKey === 'CAPTION_FEED' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Tersalin ke Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Salin Caption Feed
                    </>
                  )}
                </button>
              </div>

              {/* Card 3: Daily Story Stock Broadcast Caption */}
              <div className="rounded-3xl bg-[#0F2547]/70 border border-[#9EC6E3]/20 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#D4A843] uppercase tracking-wider">
                      Broadcast Story & WhatsApp
                    </span>
                    <span className="text-xs text-[#9EC6E3]">Template Stok Harian</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#071324] border border-white/10 text-xs font-mono text-slate-200 whitespace-pre-line leading-relaxed max-h-[320px] overflow-y-auto">
                    {dailyStoryCaptionText}
                  </div>
                </div>

                <button
                  onClick={() => handleCopy('CAPTION_STORY', dailyStoryCaptionText)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    copiedKey === 'CAPTION_STORY'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#D4A843] text-[#0F2547] hover:brightness-110 active:scale-95'
                  }`}
                >
                  {copiedKey === 'CAPTION_STORY' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Tersalin ke Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Salin Teks Broadcast
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── FULLSCREEN PREVIEW MODAL FOR SCREEN RECORDING ── */}
      {fullscreenStory !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          {/* Top Bar with Close Button */}
          <div className="w-full max-w-md flex items-center justify-between pb-3 text-white">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-black tracking-wide uppercase">
                Siap Rekam Layar (9:16 Presisi)
              </span>
            </div>
            <button
              onClick={() => setFullscreenStory(null)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fullscreen Story Container (Strict 9:16 ratio) */}
          <div className="w-[360px] h-[640px] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 relative flex flex-col bg-[#0F2547] text-[#FAF8F5]">
            {/* Same Story Content */}
            {fullscreenStory === 1 ? (
              <div className="relative w-full h-full flex flex-col justify-between pt-12 pb-4 px-4 bg-gradient-to-b from-[#0F2547] via-[#112d57] to-[#0A1628] overflow-hidden">
                <div className="overflow-hidden bg-[#9EC6E3] text-[#0F2547] py-1 rounded-lg font-black text-[11px] tracking-wider uppercase shadow-md my-1">
                  <div className="whitespace-nowrap inline-block animate-[marquee_12s_linear_infinite]">
                    NOW OPEN • KEDAI BGN BERSATOE • HALIMUN • MINANGKABAU • DAAN MOGOT • NOW OPEN • KEDAI BGN BERSATOE • HALIMUN • MINANGKABAU • DAAN MOGOT •
                  </div>
                </div>

                <div className="text-center space-y-1.5 my-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A843]/20 border border-[#D4A843] text-[#D4A843] text-[11px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    BGN BERSATOE • EST. 1998
                  </div>

                  <div className="h-12 flex items-center justify-center">
                    <div className="text-xl font-black text-[#FAF8F5]">
                      {revealedTextIndex === 0 && 'Laper Saat Jeda Kuliah?'}
                      {revealedTextIndex === 1 && 'Pesan Cepat Tanpa Antre!'}
                      {revealedTextIndex === 2 && 'Ready di Kampusmu Sekarang!'}
                    </div>
                  </div>

                  <div className="animate-[floatCard_3.5s_ease-in-out_infinite] rounded-3xl bg-[#0F2547]/90 border-2 border-[#D4A843] shadow-2xl p-3 flex flex-col items-center">
                    <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-white/20">
                      <Image
                        src={
                          showcaseIndex === 0
                            ? '/images/nasi_goreng_spesial_telur.jpg'
                            : showcaseIndex === 1
                            ? '/images/spaghetti_bolognese_keju.jpg'
                            : '/images/jus_jeruk_segar.jpg'
                        }
                        alt="Menu"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-sm font-black text-[#FAF8F5]">
                        {showcaseIndex === 0 && 'Nasi Goreng Spesial Telur'}
                        {showcaseIndex === 1 && 'Spaghetti Bolognese Keju'}
                        {showcaseIndex === 2 && 'Jus Jeruk Segar'}
                      </div>
                      <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-[#D4A843] text-[#0F2547] text-xs font-black">
                        Rp10.000 - Rp15.000
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="rounded-2xl border-2 border-dashed border-[#D4A843] bg-[#071324]/80 p-3 text-center animate-[pulse_2s_infinite]">
                    <div className="text-xs font-black text-[#D4A843]">
                      🔗 Klik Link Web di Sini / @kedai.bgn_telyu
                    </div>
                  </div>
                  <div className="overflow-hidden bg-[#9EC6E3] text-[#0F2547] py-1 rounded-lg font-black text-[11px] tracking-wider uppercase shadow-md">
                    <div className="whitespace-nowrap inline-block animate-[marquee_12s_linear_infinite_reverse]">
                      KEDAI BGN BERSATOE • PESAN SEKARANG • BEBAS ANTRE • TEL-U JAKARTA •
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex flex-col justify-between pt-12 pb-4 px-4 bg-gradient-to-b from-[#0F2547] via-[#0E2240] to-[#0A1628] overflow-hidden">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#071324]/90 border border-[#9EC6E3]/30">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                      LIVE UPDATE STOK HARI INI
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#D4A843]">
                    {campusFilter === 'ALL' ? '3 Kampus' : campusFilter.replace('Kampus ', '')}
                  </span>
                </div>

                <div className="text-center py-1">
                  <div className="text-xs font-bold text-[#9EC6E3]">Total Porsi Tersedia:</div>
                  <div className="text-2xl font-black text-[#D4A843]">
                    {totalReadyPortions} Porsi Ready
                  </div>
                </div>

                <div className="space-y-1.5 my-auto max-h-[320px] overflow-y-auto pr-1">
                  {products.map((item) => {
                    const stockCount = getProductCampusStock(item, campusFilter);
                    const isReady = stockCount > 0;
                    return (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl border flex items-center justify-between gap-2 bg-[#0F2547]/80 border-[#9EC6E3]/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/20">
                            <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-[#FAF8F5] truncate leading-tight">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-[#9EC6E3]">
                              Rp{item.price.toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isReady ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                              Ready {stockCount}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                              Habis
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="p-2 rounded-xl bg-[#071324] border border-[#D4A843]/40 text-center">
                    <div className="text-[11px] font-black text-[#D4A843]">
                      OPEN PRE-ORDER BESOK (07.00 - 17.00 WIB)
                    </div>
                  </div>
                  <div className="rounded-xl border border-dashed border-[#9EC6E3] bg-[#0F2547]/90 p-2 text-center animate-[pulse_2s_infinite]">
                    <div className="text-[11px] font-black text-[#9EC6E3]">
                      🔗 Pesan di Web: @kedai.bgn_telyu
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
