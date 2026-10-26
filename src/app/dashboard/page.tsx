'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  Minus,
  Plus,
  Save,
  RotateCcw,
  Download,
  Check,
  Clock,
  MapPin,
  X,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { Order, OrderStatus, Product, CampusLocation } from '@/types';
import { formatIDR, formatWIB, formatTo62Phone } from '@/lib/formatters';
import { INITIAL_PRODUCTS } from '@/lib/products-data';

type ActiveTab = 'ORDERS' | 'STOCK' | 'FINANCE';
type OrderFilter = {
  type: 'ALL' | 'READY' | 'PO';
  campus: 'ALL' | CampusLocation;
  status: 'ALL' | 'WAITING' | 'PROCESSING' | 'DONE';
};
type StockDraft = Record<string, { halimun: number; minangkabau: number; daan_mogot: number; po_available: boolean }>;

const CAMPUS_LABELS: Record<CampusLocation, string> = {
  'Kampus B Halimun': 'Halimun',
  'Kampus C Minangkabau': 'Minangkabau',
  'Kampus SB Daan Mogot': 'Daan Mogot',
};

const CAMPUS_COLORS: Record<CampusLocation, string> = {
  'Kampus B Halimun': 'bg-violet-50 text-violet-700 border-violet-200',
  'Kampus C Minangkabau': 'bg-sky-50 text-sky-700 border-sky-200',
  'Kampus SB Daan Mogot': 'bg-teal-50 text-teal-700 border-teal-200',
};

const WAITING_STATUSES: OrderStatus[] = ['WAITING_PAYMENT'];
const PROCESSING_STATUSES: OrderStatus[] = ['PAID', 'COOKING', 'READY_FOR_DELIVERY'];
const DONE_STATUSES: OrderStatus[] = ['COMPLETED'];

function getStatusGroup(status: OrderStatus): 'WAITING' | 'PROCESSING' | 'DONE' | 'OTHER' {
  if (WAITING_STATUSES.includes(status)) return 'WAITING';
  if (PROCESSING_STATUSES.includes(status)) return 'PROCESSING';
  if (DONE_STATUSES.includes(status)) return 'DONE';
  return 'OTHER';
}

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case 'WAITING_PAYMENT': return 'Menunggu Bayar';
    case 'PAID': return 'Lunas (Diproses)';
    case 'COOKING': return 'Lunas (Diproses)';
    case 'READY_FOR_DELIVERY': return 'Lunas (Diproses)';
    case 'COMPLETED': return 'Selesai';
    case 'EXPIRED': return 'Kedaluwarsa';
    case 'CANCELLED': return 'Dibatalkan';
    default: return status;
  }
}

function statusPill(status: OrderStatus): string {
  const group = getStatusGroup(status);
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border';
  if (group === 'WAITING') return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  if (group === 'PROCESSING') return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  if (group === 'DONE') return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  return `${base} bg-slate-100 text-slate-500 border-slate-200`;
}

// StepperInput (uses type="text" so it is always a controlled input)
function StepperInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(value)}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
          onChange(isNaN(n) ? 0 : Math.max(0, n));
        }}
        className="w-12 h-7 text-center text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0F2547]"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// CustomSelect (fully styled dropdown replacing native select)
interface SelectOption { value: string; label: string; }
function CustomSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#D4A843]/20 focus:border-[#0F2547] flex items-center gap-2 transition-all whitespace-nowrap min-w-[130px]"
      >
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 py-1 min-w-[160px] overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                opt.value === value ? 'bg-[#0F2547]/10 text-[#0F2547] font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Filter option definitions
const TYPE_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Semua Tipe' },
  { value: 'READY', label: 'Ready Hari Ini' },
  { value: 'PO', label: 'Pre-Order Besok' },
];
const CAMPUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Semua Kampus' },
  { value: 'Kampus B Halimun', label: 'Halimun' },
  { value: 'Kampus C Minangkabau', label: 'Minangkabau' },
  { value: 'Kampus SB Daan Mogot', label: 'Daan Mogot' },
];
const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'WAITING', label: 'Menunggu Bayar' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'DONE', label: 'Selesai' },
];

// Build initial stock draft from product list
function buildDraft(prods: Product[]): StockDraft {
  const draft: StockDraft = {};
  prods.forEach((p) => {
    draft[p.id] = {
      halimun: p.stock_halimun,
      minangkabau: p.stock_minangkabau,
      daan_mogot: p.stock_daan_mogot,
      po_available: p.po_available,
    };
  });
  return draft;
}

const nextStatusMap: Partial<Record<OrderStatus, { label: string; value: OrderStatus }>> = {
  WAITING_PAYMENT: { label: 'Tandai Lunas', value: 'PAID' },
  PAID: { label: 'Tandai Selesai', value: 'COMPLETED' },
  COOKING: { label: 'Tandai Selesai', value: 'COMPLETED' },
  READY_FOR_DELIVERY: { label: 'Tandai Selesai', value: 'COMPLETED' },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockSaved, setStockSaved] = useState(false);
  // Lazy initializer ensures stockDraft is never empty on first render
  const [stockDraft, setStockDraft] = useState<StockDraft>(() => buildDraft(INITIAL_PRODUCTS));
  const [filter, setFilter] = useState<OrderFilter>({ type: 'ALL', campus: 'ALL', status: 'ALL' });
  const hasFilter = filter.type !== 'ALL' || filter.campus !== 'ALL' || filter.status !== 'ALL';

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) setOrders(data.orders);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data.success && data.products) {
        const prods: Product[] = data.products;
        setProducts(prods);
        const draft: StockDraft = {};
        prods.forEach((p) => {
          draft[p.id] = { halimun: p.stock_halimun, minangkabau: p.stock_minangkabau, daan_mogot: p.stock_daan_mogot, po_available: p.po_available };
        });
        setStockDraft(draft);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchProducts]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdatingStatus(orderId);
    try {
      await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, newStatus }) });
      await fetchOrders();
    } catch { /* silent */ } finally { setIsUpdatingStatus(null); }
  };

  const handleSaveStock = async () => {
    setIsSavingStock(true);
    try {
      const stockList = products.map((p) => ({
        id: p.id,
        stock_halimun: stockDraft[p.id]?.halimun ?? p.stock_halimun,
        stock_minangkabau: stockDraft[p.id]?.minangkabau ?? p.stock_minangkabau,
        stock_daan_mogot: stockDraft[p.id]?.daan_mogot ?? p.stock_daan_mogot,
        po_available: stockDraft[p.id]?.po_available ?? p.po_available,
      }));
      await fetch('/api/menu', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockList }) });
      await fetchProducts();
      setStockSaved(true);
      setTimeout(() => setStockSaved(false), 2500);
    } catch { /* silent */ } finally { setIsSavingStock(false); }
  };

  const handleResetStock = async () => {
    if (!confirm('Reset semua stok Ready ke 0? Aksi ini tidak bisa dibatalkan.')) return;
    try {
      await fetch('/api/menu', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'RESET_READY' }) });
      await fetchProducts();
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* silent */
    } finally {
      window.location.href = '/login';
    }
  };

  const patchDraft = (productId: string, key: 'halimun' | 'minangkabau' | 'daan_mogot' | 'po_available', value: number | boolean) => {
    setStockDraft((prev) => ({
      ...prev,
      [productId]: {
        halimun: prev[productId]?.halimun ?? 0,
        minangkabau: prev[productId]?.minangkabau ?? 0,
        daan_mogot: prev[productId]?.daan_mogot ?? 0,
        po_available: prev[productId]?.po_available ?? true,
        [key]: value,
      },
    }));
  };

  const filteredOrders = orders
    .filter((o) => {
      if (filter.type === 'READY' && o.order_type !== 'READY') return false;
      if (filter.type === 'PO' && o.order_type !== 'PO') return false;
      if (filter.campus !== 'ALL' && o.campus_location !== filter.campus) return false;
      if (filter.status !== 'ALL') {
        const g = getStatusGroup(o.order_status);
        if (filter.status === 'WAITING' && g !== 'WAITING') return false;
        if (filter.status === 'PROCESSING' && g !== 'PROCESSING') return false;
        if (filter.status === 'DONE' && g !== 'DONE') return false;
      }
      return true;
    })
    .sort((a, b) => {
      const toMins = (t: string) => { const m = t.match(/(\d{1,2}):(\d{2})/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 9999; };
      return toMins(a.scheduled_time) - toMins(b.scheduled_time);
    });

  const paidOrders = orders.filter((o) => [...PROCESSING_STATUSES, ...DONE_STATUSES].includes(o.order_status));
  const totalGross = paidOrders.reduce((acc, o) => acc + (o.gross_amount || 0), 0);
  const totalMdr = paidOrders.reduce((acc, o) => { const pay = o.payments?.[0]; return acc + (pay?.mdr_fee_amount ?? Math.round((o.gross_amount || 0) * 0.007)); }, 0);
  const totalNet = totalGross - totalMdr;
  const activeProcessingCount = orders.filter((o) => getStatusGroup(o.order_status) === 'PROCESSING').length;

  const handleExportCSV = () => {
    const header = ['ID Transaksi','Waktu','Nama Pemesan','Kampus','Detail Menu','Metode','Gross (Rp)','MDR 0.7% (Rp)','Net Revenue (Rp)','Status'].join(',');
    const rows = paidOrders.map((o) => {
      const pay = o.payments?.[0];
      const mdrFee = pay?.mdr_fee_amount ?? Math.round((o.gross_amount || 0) * 0.007);
      const netRev = pay?.net_revenue ?? (o.gross_amount || 0) - mdrFee;
      const items = (o.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join('; ');
      return [o.order_code, formatWIB(o.created_at), `"${o.customer_name}"`, `"${o.campus_location}"`, `"${items}"`, 'QRIS', o.gross_amount, mdrFee, netRev, statusLabel(o.order_status)].join(',');
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-keuangan-bgn-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 antialiased text-slate-900">
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-[#D4A843] bg-[#0A1628] shadow-sm">
              <Image src="/images/bgn-logo.jpg" alt="Logo Kedai BGN Bersatoe" width={40} height={40} className="object-cover w-full h-full" priority />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-[#0F2547] tracking-tight">KEDAI BGN BERSATOE</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#D4A843]/20 text-[#0F2547] border border-[#D4A843]/40">EST. 1998</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Admin &amp; Operational Panel</div>
            </div>
            <Link href="/" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#0F2547] transition-colors ml-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Lihat Toko
            </Link>
            <Link
              href="/social-kit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F2547] text-[#FAF8F5] hover:bg-[#163566] text-xs font-bold transition-all shadow-xs ml-1 border border-[#9EC6E3]/30"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4A843]" />
              <span className="hidden sm:inline">Instagram</span> Studio
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5">
              {([{ key: 'ORDERS', label: 'Pesanan Masuk' }, { key: 'STOCK', label: 'Stok Harian' }, { key: 'FINANCE', label: 'Rekap Keuangan' }] as { key: ActiveTab; label: string }[]).map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`h-8 px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab.label}
                  {tab.key === 'ORDERS' && activeProcessingCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0F2547] text-[#D4A843] ring-1 ring-[#D4A843] text-[10px] font-black">{activeProcessingCount}</span>
                  )}
                </button>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              title="Keluar dari sesi Admin"
              className="h-8 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── TAB 1: PESANAN MASUK ── */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchOrders}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /><span>Refresh</span>
              </button>

              <CustomSelect
                value={filter.type}
                onChange={(v) => setFilter((f) => ({ ...f, type: v as OrderFilter['type'] }))}
                options={TYPE_OPTIONS}
              />
              <CustomSelect
                value={filter.campus}
                onChange={(v) => setFilter((f) => ({ ...f, campus: v as OrderFilter['campus'] }))}
                options={CAMPUS_OPTIONS}
              />
              <CustomSelect
                value={filter.status}
                onChange={(v) => setFilter((f) => ({ ...f, status: v as OrderFilter['status'] }))}
                options={STATUS_OPTIONS}
              />

              {hasFilter && (
                <button
                  type="button"
                  onClick={() => setFilter({ type: 'ALL', campus: 'ALL', status: 'ALL' })}
                  className="h-9 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <span className="ml-auto text-xs text-slate-400 font-medium">{filteredOrders.length} pesanan</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="py-20 text-center flex flex-col items-center gap-2 text-sm text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-300" />
                  <span>Memuat pesanan...</span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-20 text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-400">Belum ada pesanan</p>
                  <p className="text-xs text-slate-300">Pesanan dari pelanggan akan muncul di sini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        {['ID & Tipe','Pembeli','Kampus & Titik Temu','Jam Antar','Detail Menu','Total (QRIS)','Status & Aksi'].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map((order) => {
                        const phone = formatTo62Phone(order.customer_whatsapp);
                        const waUrl = `https://wa.me/${phone}`;
                        const next = nextStatusMap[order.order_status];
                        const isUpdating = isUpdatingStatus === order.id;
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/60 transition-colors align-top">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-mono text-xs font-bold text-[#0F2547]">{order.order_code}</div>
                              <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${order.order_type === 'READY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                {order.order_type === 'READY' ? 'Ready Hari Ini' : 'PO Besok'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-semibold text-xs text-slate-900">{order.customer_name}</div>
                              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                                <MessageSquare className="w-3 h-3" /><span>{order.customer_whatsapp}</span><ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${CAMPUS_COLORS[order.campus_location] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                <MapPin className="w-2.5 h-2.5" />{CAMPUS_LABELS[order.campus_location] || order.campus_location}
                              </span>
                              {order.location_notes && <p className="mt-1 text-[11px] text-slate-500 max-w-[180px] leading-snug">{order.location_notes}</p>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                                <Clock className="w-3.5 h-3.5 text-[#0F2547]" />{order.scheduled_time}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1.5 min-w-[200px]">
                                {order.items?.map((it) => (
                                  <div key={it.id} className="text-xs">
                                    <span className="font-semibold text-slate-800">{it.quantity}x {it.product_name}</span>
                                    {it.selected_options && Object.keys(it.selected_options).length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {Object.entries(it.selected_options).map(([k, v]) => (
                                          <span key={k} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{v}</span>
                                        ))}
                                      </div>
                                    )}
                                    {it.special_notes && <p className="text-[10px] text-amber-600 mt-0.5 italic">&ldquo;{it.special_notes}&rdquo;</p>}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-extrabold text-slate-900">{formatIDR(order.gross_amount)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                <span className={statusPill(order.order_status)}>{statusLabel(order.order_status)}</span>
                                {next && (
                                  <div>
                                    <button type="button" disabled={isUpdating} onClick={() => handleUpdateStatus(order.id, next.value)} className="mt-1 h-8 px-3 rounded-lg bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 disabled:opacity-50 text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap">
                                      {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-[#D4A843]" />}
                                      {next.label}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: STOK HARIAN ── */}
        {activeTab === 'STOCK' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-extrabold text-base text-slate-900">Atur Stok Ready Harian per Kampus</h2>
                <p className="text-xs text-slate-500 mt-0.5">Stok berkurang otomatis saat pelanggan checkout. Update setiap pagi sebelum operasional.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleResetStock} className="h-9 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />Reset Semua ke 0
                </button>
                <button type="button" onClick={handleSaveStock} disabled={isSavingStock} className="h-9 px-4 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 disabled:opacity-60 text-xs font-bold flex items-center gap-1.5 transition-colors">
                  {stockSaved ? <><Check className="w-3.5 h-3.5 text-[#D4A843]" />Tersimpan!</> : isSavingStock ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Menyimpan...</> : <><Save className="w-3.5 h-3.5 text-[#D4A843]" />Simpan Perubahan</>}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Menu & Harga</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Kampus B Halimun</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Kampus C Minangkabau</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Kampus SB Daan Mogot</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status PO Besok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const d = stockDraft[p.id] ?? { halimun: p.stock_halimun, minangkabau: p.stock_minangkabau, daan_mogot: p.stock_daan_mogot, po_available: p.po_available };
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                            <div className="text-xs text-[#0F2547] font-bold mt-0.5">{formatIDR(p.price)}</div>
                          </td>
                          <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><StepperInput value={d.halimun} onChange={(v) => patchDraft(p.id, 'halimun', v)} /></div></td>
                          <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><StepperInput value={d.minangkabau} onChange={(v) => patchDraft(p.id, 'minangkabau', v)} /></div></td>
                          <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><StepperInput value={d.daan_mogot} onChange={(v) => patchDraft(p.id, 'daan_mogot', v)} /></div></td>
                          <td className="px-4 py-3.5 text-center">
                            <button type="button" onClick={() => patchDraft(p.id, 'po_available', !d.po_available)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${d.po_available ? 'bg-[#0F2547]' : 'bg-slate-200'}`}>
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${d.po_available ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <div className={`text-[10px] font-bold mt-1 ${d.po_available ? 'text-[#0F2547]' : 'text-slate-400'}`}>{d.po_available ? 'Buka PO' : 'Tutup'}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: REKAP KEUANGAN ── */}
        {activeTab === 'FINANCE' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Omzet Kotor (Gross)', value: formatIDR(totalGross), sub: `${paidOrders.length} transaksi lunas`, valueClass: 'text-slate-900' },
                { label: 'Potongan MDR QRIS (0,7%)', value: formatIDR(totalMdr), sub: 'Tarif standar Bank Indonesia', valueClass: 'text-red-600' },
                { label: 'Pendapatan Bersih (Net Revenue)', value: formatIDR(totalNet), sub: 'Setelah potongan MDR', valueClass: 'text-emerald-600' },
              ].map((card) => (
                <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
                  <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                  <p className={`text-2xl font-black ${card.valueClass}`}>{card.value}</p>
                  <p className="text-[11px] text-slate-400">{card.sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Riwayat Transaksi Lunas</h3>
                <button type="button" onClick={handleExportCSV} className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors">
                  <Download className="w-3.5 h-3.5" />Export CSV
                </button>
              </div>
              {paidOrders.length === 0 ? (
                <div className="py-16 text-center"><p className="text-sm text-slate-400">Belum ada transaksi lunas hari ini.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        {['ID Transaksi','Waktu','Nama','Kampus','Detail Menu','Metode','Gross','MDR 0.7%','Net','Status'].map((h) => (
                          <th key={h} className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paidOrders.map((o) => {
                        const pay = o.payments?.[0];
                        const mdrFee = pay?.mdr_fee_amount ?? Math.round((o.gross_amount || 0) * 0.007);
                        const netRev = pay?.net_revenue ?? (o.gross_amount || 0) - mdrFee;
                        const itemsStr = (o.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ');
                        return (
                          <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-3 py-3 font-mono font-bold text-[#0F2547] whitespace-nowrap">{o.order_code}</td>
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{formatWIB(o.created_at)}</td>
                            <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{o.customer_name}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${CAMPUS_COLORS[o.campus_location] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{CAMPUS_LABELS[o.campus_location] || o.campus_location}</span>
                            </td>
                            <td className="px-3 py-3 max-w-[200px] text-slate-600" title={itemsStr}><span className="line-clamp-2">{itemsStr}</span></td>
                            <td className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">QRIS</td>
                            <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">{formatIDR(o.gross_amount)}</td>
                            <td className="px-3 py-3 text-red-500 font-mono whitespace-nowrap">-{formatIDR(mdrFee)}</td>
                            <td className="px-3 py-3 font-black text-emerald-600 whitespace-nowrap">{formatIDR(netRev)}</td>
                            <td className="px-3 py-3"><span className={statusPill(o.order_status)}>{statusLabel(o.order_status)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
