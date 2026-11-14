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
  Save,
  Download,
  Check,
  Clock,
  MapPin,
  X,
  Sparkles,
  LogOut,
  Calendar,
  Plus,
  Trash2,
  CalendarOff,
  Printer,
  ChefHat,
  FileText,
  Copy,
  FileSpreadsheet,
  Camera,
  Eye,
  Upload,
  Banknote,
  CheckCircle2,
} from 'lucide-react';
import { Order, OrderStatus, Product, CampusLocation, OperationalSettings } from '@/types';
import { formatIDR, formatWIB, formatTo62Phone } from '@/lib/formatters';
import { INITIAL_PRODUCTS } from '@/lib/products-data';

type ActiveTab = 'ORDERS' | 'RECAP' | 'SCHEDULE' | 'FINANCE';
type OrderFilter = {
  campus: 'ALL' | CampusLocation;
  status: 'ALL' | 'WAITING' | 'PROCESSING' | 'DONE';
};

const CAMPUS_LABELS: Record<CampusLocation, string> = {
  'Kampus B Halimun': 'Halimun',
  'Kampus C Minangkabau': 'Minangkabau',
};

const CAMPUS_COLORS: Record<CampusLocation, string> = {
  'Kampus B Halimun': 'bg-violet-50 text-violet-700 border-violet-200',
  'Kampus C Minangkabau': 'bg-sky-50 text-sky-700 border-sky-200',
};

const WAITING_STATUSES: string[] = ['WAITING_PAYMENT', 'PENDING'];
const PROCESSING_STATUSES: OrderStatus[] = ['PAID', 'COOKING', 'READY_FOR_DELIVERY'];
const DONE_STATUSES: OrderStatus[] = ['COMPLETED'];

function getStatusGroup(status: OrderStatus | string): 'WAITING' | 'PROCESSING' | 'DONE' | 'OTHER' {
  if (WAITING_STATUSES.includes(status)) return 'WAITING';
  if (PROCESSING_STATUSES.includes(status as OrderStatus)) return 'PROCESSING';
  if (DONE_STATUSES.includes(status as OrderStatus)) return 'DONE';
  return 'OTHER';
}

function statusLabel(status: OrderStatus | string, paymentMethod: string): string {
  if (status === 'WAITING_PAYMENT' || status === 'PENDING') {
    return paymentMethod === 'CASH' ? 'Menunggu Bayar (CASH)' : 'Menunggu Bayar';
  }
  switch (status) {
    case 'PAID':
      return 'Lunas (Diproses)';
    case 'COOKING':
      return 'Sedang Dimasak';
    case 'READY_FOR_DELIVERY':
      return 'Siap Diantar';
    case 'COMPLETED':
      return 'Selesai';
    case 'EXPIRED':
      return 'Kedaluwarsa';
    case 'CANCELLED':
      return 'Dibatalkan';
    default:
      return String(status);
  }
}

function statusPill(status: OrderStatus | string): string {
  const group = getStatusGroup(status);
  const base =
    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border';
  if (group === 'WAITING') return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  if (group === 'PROCESSING') return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  if (group === 'DONE') return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  return `${base} bg-slate-100 text-slate-500 border-slate-200`;
}

interface SelectOption {
  value: string;
  label: string;
}

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const cur = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between gap-2 min-w-[130px] transition-colors shadow-xs"
      >
        <span className="truncate">{cur?.label || value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-full overflow-hidden text-xs">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                opt.value === value
                  ? 'bg-[#0F2547]/10 text-[#0F2547] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <Check className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'WAITING', label: 'Menunggu Bayar' },
  { value: 'PROCESSING', label: 'Lunas & Diproses' },
  { value: 'DONE', label: 'Selesai' },
];

const nextStatusMap: Record<string, { label: string; value: OrderStatus }> = {
  WAITING_PAYMENT: { label: 'Konfirmasi Bayar', value: 'PAID' },
  PENDING: { label: 'Konfirmasi Bayar', value: 'PAID' },
  PAID: { label: 'Mulai Masak', value: 'COOKING' },
  COOKING: { label: 'Siap Diantar', value: 'READY_FOR_DELIVERY' },
  READY_FOR_DELIVERY: { label: 'Tandai Selesai', value: 'COMPLETED' },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState<OrderFilter>({ campus: 'ALL', status: 'ALL' });
  const hasFilter = filter.campus !== 'ALL' || filter.status !== 'ALL';

  // Operational Settings (Holidays & Time Slots)
  const [settings, setSettings] = useState<OperationalSettings>({
    holidays: [],
    activeTimeSlots: [
      '10:00 WIB',
      '11:00 WIB',
      '12:00 WIB',
      '12:30 WIB',
      '13:00 WIB',
      '14:00 WIB',
      '15:00 WIB',
    ],
    allowCash: true,
  });
  const [newHolidayInput, setNewHolidayInput] = useState('');
  const [newSlotInput, setNewSlotInput] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');
  const [selectedRecapDate, setSelectedRecapDate] = useState<string>('ALL');
  const [recapCopied, setRecapCopied] = useState(false);

  // Delete modal & admin authorization state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Cash / COD Delivery Proof Modal state
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [orderForProof, setOrderForProof] = useState<Order | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofError, setProofError] = useState('');
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  // Financial recap filter state
  const [financeFilter, setFinanceFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      let serverOrders: Order[] = [];
      if (data.success && Array.isArray(data.orders)) {
        serverOrders = data.orders;
      }

      // Merge with localStorage cached orders for client resiliency
      if (typeof window !== 'undefined') {
        try {
          const localCached: Order[] = JSON.parse(
            localStorage.getItem('bgn_recent_orders') || '[]'
          );
          const map = new Map<string, Order>();
          serverOrders.forEach((o) => map.set(o.id, o));
          localCached.forEach((o) => {
            if (!map.has(o.id)) map.set(o.id, o);
          });
          setOrders(Array.from(map.values()));
        } catch {
          setOrders(serverOrders);
        }
      } else {
        setOrders(serverOrders);
      }
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchSettings();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchProducts, fetchSettings]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdatingStatus(orderId);
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      });
      await fetchOrders();
    } catch {
      /* silent */
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleToggleProduct = async (productId: string, currentAvailable: boolean) => {
    try {
      await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, isAvailable: !currentAvailable }),
      });
      await fetchProducts();
    } catch {
      /* silent */
    }
  };

  const handleSaveSettings = async (updatedSettings: OperationalSettings) => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSettingsSavedMessage('Pengaturan berhasil disimpan!');
        setTimeout(() => setSettingsSavedMessage(''), 2500);
      }
    } catch {
      /* silent */
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddHoliday = () => {
    if (!newHolidayInput) return;
    if (settings.holidays.includes(newHolidayInput)) return;
    const nextHolidays = [...settings.holidays, newHolidayInput].sort();
    const nextSettings = { ...settings, holidays: nextHolidays };
    setSettings(nextSettings);
    setNewHolidayInput('');
    handleSaveSettings(nextSettings);
  };

  const handleRemoveHoliday = (h: string) => {
    const nextHolidays = settings.holidays.filter((item) => item !== h);
    const nextSettings = { ...settings, holidays: nextHolidays };
    setSettings(nextSettings);
    handleSaveSettings(nextSettings);
  };

  const handleAddTimeSlot = () => {
    if (!newSlotInput.trim()) return;
    let slot = newSlotInput.trim();
    if (!slot.endsWith('WIB')) slot += ' WIB';
    if (settings.activeTimeSlots.includes(slot)) return;
    const nextSlots = [...settings.activeTimeSlots, slot];
    const nextSettings = { ...settings, activeTimeSlots: nextSlots };
    setSettings(nextSettings);
    setNewSlotInput('');
    handleSaveSettings(nextSettings);
  };

  const handleRemoveTimeSlot = (slot: string) => {
    const nextSlots = settings.activeTimeSlots.filter((s) => s !== slot);
    const nextSettings = { ...settings, activeTimeSlots: nextSlots };
    setSettings(nextSettings);
    handleSaveSettings(nextSettings);
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

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (filter.campus !== 'ALL' && o.campus_location !== filter.campus) return false;
    if (filter.status !== 'ALL') {
      const g = getStatusGroup(o.order_status);
      if (filter.status === 'WAITING' && g !== 'WAITING') return false;
      if (filter.status === 'PROCESSING' && g !== 'PROCESSING') return false;
      if (filter.status === 'DONE' && g !== 'DONE') return false;
    }
    return true;
  });

  const countHalimun = orders.filter((o) => o.campus_location === 'Kampus B Halimun').length;
  const countMinangkabau = orders.filter((o) => o.campus_location === 'Kampus C Minangkabau').length;

  const validFinanceOrders = orders.filter(
    (o) => o.order_status !== 'CANCELLED' && o.order_status !== 'EXPIRED'
  );
  const paidOrders = validFinanceOrders.filter((o) =>
    [...PROCESSING_STATUSES, ...DONE_STATUSES].includes(o.order_status)
  );
  const pendingOrders = validFinanceOrders.filter(
    (o) => !['PAID', 'COOKING', 'READY_FOR_DELIVERY', 'COMPLETED'].includes(o.order_status)
  );

  const totalGross = paidOrders.reduce((acc, o) => acc + (o.gross_amount || 0), 0);
  const totalPendingGross = pendingOrders.reduce((acc, o) => acc + (o.gross_amount || 0), 0);
  const totalMdr = paidOrders.reduce((acc, o) => {
    if (o.payment_method === 'CASH') return acc;
    const pay = o.payments?.[0];
    return acc + (pay?.mdr_fee_amount ?? Math.round((o.gross_amount || 0) * 0.007));
  }, 0);
  const totalNet = totalGross - totalMdr;
  const activeProcessingCount = orders.filter(
    (o) => getStatusGroup(o.order_status) === 'PROCESSING'
  ).length;

  const displayedFinanceOrders = validFinanceOrders.filter((o) => {
    const isPaid = [...PROCESSING_STATUSES, ...DONE_STATUSES].includes(o.order_status);
    if (financeFilter === 'PAID') return isPaid;
    if (financeFilter === 'PENDING') return !isPaid;
    return true;
  });

  const handleOpenProofModal = (order: Order) => {
    setOrderForProof(order);
    setProofPreview(null);
    setProofError('');
    setProofModalOpen(true);
  };

  const handleFileSelectProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 900;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setProofPreview(dataUrl);
        } else {
          setProofPreview(ev.target?.result as string);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCashProof = async () => {
    if (!orderForProof) return;
    if (!proofPreview) {
      setProofError('Wajib melampirkan foto pembeli saat serah terima makanan dan pembayaran tunai!');
      return;
    }

    setIsUploadingProof(true);
    setProofError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderForProof.id,
          newStatus: 'PAID',
          proofBase64: proofPreview,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setProofError(data.message || 'Gagal menyimpan konfirmasi pembayaran.');
        return;
      }

      const updatedOrder = data.order || {
        ...orderForProof,
        order_status: 'PAID' as OrderStatus,
        delivery_proof_url: proofPreview,
      };

      setOrders((prev) =>
        prev.map((o) => (o.id === orderForProof.id ? { ...o, ...updatedOrder } : o))
      );

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`bgn_order_${orderForProof.id}`, JSON.stringify(updatedOrder));
          const cached: Order[] = JSON.parse(
            localStorage.getItem('bgn_recent_orders') || '[]'
          );
          const nextCached = cached.map((o) =>
            o.id === orderForProof.id ? { ...o, ...updatedOrder } : o
          );
          localStorage.setItem('bgn_recent_orders', JSON.stringify(nextCached));
        } catch {
          /* silent */
        }
      }

      setProofModalOpen(false);
      setOrderForProof(null);
      setProofPreview(null);
      await fetchOrders();
    } catch {
      setProofError('Terjadi kesalahan jaringan saat mengunggah foto.');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleExportCSV = () => {
    const header = [
      'ID Pesanan',
      'Waktu',
      'Pembeli',
      'WhatsApp',
      'Kampus',
      'Menu',
      'Metode',
      'Gross',
      'MDR',
      'Net',
      'Status Pembayaran',
      'Bukti Foto',
    ].join(',');
    const rows = displayedFinanceOrders.map((o) => {
      const isPaid = [...PROCESSING_STATUSES, ...DONE_STATUSES].includes(o.order_status);
      const isCash = o.payment_method === 'CASH';
      const mdrFee = isPaid
        ? isCash
          ? 0
          : o.payments?.[0]?.mdr_fee_amount ?? Math.round((o.gross_amount || 0) * 0.007)
        : 0;
      const netRev = isPaid ? (o.gross_amount || 0) - mdrFee : 0;
      const items = (o.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join('; ');
      const proof = o.delivery_proof_url || o.payments?.[0]?.deeplink_url || '-';
      return [
        o.order_code,
        formatWIB(o.created_at),
        `"${o.customer_name}"`,
        `"${o.customer_whatsapp}"`,
        `"${o.campus_location}"`,
        `"${items}"`,
        o.payment_method,
        o.gross_amount,
        mdrFee,
        netRev,
        isPaid ? 'LUNAS' : 'MENUNGGU BAYAR',
        `"${proof}"`,
      ].join(',');
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-keuangan-bgn-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcelFormatted = () => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const totalCashGross = paidOrders
      .filter((o) => o.payment_method === 'CASH')
      .reduce((acc, o) => acc + (o.gross_amount || 0), 0);
    const totalQrisGross = paidOrders
      .filter((o) => o.payment_method !== 'CASH')
      .reduce((acc, o) => acc + (o.gross_amount || 0), 0);

    const rowsHtml = displayedFinanceOrders
      .map((o, idx) => {
        const isPaid = [...PROCESSING_STATUSES, ...DONE_STATUSES].includes(o.order_status);
        const isCash = o.payment_method === 'CASH';
        const mdrFee = isPaid
          ? isCash
            ? 0
            : o.payments?.[0]?.mdr_fee_amount ?? Math.round((o.gross_amount || 0) * 0.007)
          : 0;
        const netRev = isPaid ? (o.gross_amount || 0) - mdrFee : 0;
        const items = (o.items || [])
          .map((it) => `${it.quantity}x ${it.product_name}`)
          .join(', ');
        const campus = CAMPUS_LABELS[o.campus_location] || o.campus_location;
        const notes = [o.location_notes, o.order_notes].filter(Boolean).join(' | ');
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        const proof = o.delivery_proof_url || o.payments?.[0]?.deeplink_url || null;

        return `
          <tr style="background-color: ${rowBg};">
            <td style="border: 1px solid #CBD5E1; padding: 8px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; font-weight: bold; color: #0F2547;">${o.order_code}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px;">${formatWIB(o.created_at)}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; font-weight: bold;">${o.customer_name}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; mso-number-format:'\\@';">${o.customer_whatsapp}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px;">${campus}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px;">${notes || '-'}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px;">${items}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; text-align: center; font-weight: bold;">${o.payment_method}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; text-align: right; mso-number-format:'#,##0';">${o.gross_amount || 0}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; text-align: right; color: #DC2626; mso-number-format:'#,##0';">${mdrFee}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; text-align: right; font-weight: bold; color: ${isPaid ? '#059669' : '#D97706'}; mso-number-format:'#,##0';">${isPaid ? netRev : 'Pending'}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; text-align: center; font-weight: bold; color: ${isPaid ? '#059669' : '#D97706'};">${isPaid ? 'LUNAS' : 'MENUNGGU BAYAR'}</td>
            <td style="border: 1px solid #CBD5E1; padding: 8px; text-align: center;">${proof ? `<a href="${proof}" target="_blank">Lihat Bukti Foto</a>` : '-'}</td>
          </tr>
        `;
      })
      .join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Keuangan</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1E293B; }
          table { border-collapse: collapse; width: 100%; }
          th { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; }
          td { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="14" style="background-color: #0F2547; color: #FAF8F5; font-size: 16pt; font-weight: bold; text-align: center; padding: 16px; border: 1px solid #0F2547;">
              KEDAI BGN BERSATOE - REKAP LAPORAN KEUANGAN &amp; TRANSAKSI
            </td>
          </tr>
          <tr>
            <td colspan="14" style="background-color: #1E3A5F; color: #D4A843; font-size: 10pt; font-weight: bold; text-align: center; padding: 6px; border: 1px solid #1E3A5F;">
              Waktu Ekspor: ${todayStr} | Tel-U Kampus Halimun &amp; Minangkabau
            </td>
          </tr>
          <tr><td colspan="14" style="height: 12px;"></td></tr>
        </table>

        <table style="border: 2px solid #0F2547; margin-bottom: 16px;">
          <tr style="background-color: #F1F5F9;">
            <th colspan="3" style="border: 1px solid #CBD5E1; padding: 10px; text-align: left; font-size: 11pt; color: #475569;">Total Omzet Masuk (Lunas)</th>
            <th colspan="3" style="border: 1px solid #CBD5E1; padding: 10px; text-align: left; font-size: 11pt; color: #DC2626;">Total Potongan MDR QRIS (0.7%)</th>
            <th colspan="4" style="border: 1px solid #CBD5E1; padding: 10px; text-align: left; font-size: 11pt; color: #059669;">Pendapatan Bersih (Net Revenue)</th>
            <th colspan="4" style="border: 1px solid #CBD5E1; padding: 10px; text-align: left; font-size: 11pt; color: #0F2547;">Total Transaksi (${paidOrders.length} Lunas, ${pendingOrders.length} Pending)</th>
          </tr>
          <tr style="background-color: #FFFFFF;">
            <td colspan="3" style="border: 1px solid #CBD5E1; padding: 12px; font-size: 14pt; font-weight: bold; color: #0F2547; mso-number-format:'#,##0';">${totalGross}</td>
            <td colspan="3" style="border: 1px solid #CBD5E1; padding: 12px; font-size: 14pt; font-weight: bold; color: #DC2626; mso-number-format:'#,##0';">-${totalMdr}</td>
            <td colspan="4" style="border: 1px solid #CBD5E1; padding: 12px; font-size: 14pt; font-weight: bold; color: #059669; mso-number-format:'#,##0';">${totalNet}</td>
            <td colspan="4" style="border: 1px solid #CBD5E1; padding: 12px; font-size: 14pt; font-weight: bold; color: #0F2547;">${displayedFinanceOrders.length} Pesanan</td>
          </tr>
          <tr style="background-color: #F8FAFC;">
            <td colspan="3" style="border: 1px solid #CBD5E1; padding: 6px; font-size: 9pt; color: #64748B;">Lunas: ${formatIDR(totalGross)} | Pending: ${formatIDR(totalPendingGross)}</td>
            <td colspan="3" style="border: 1px solid #CBD5E1; padding: 6px; font-size: 9pt; color: #64748B;">MDR 0% untuk Tunai Cash</td>
            <td colspan="4" style="border: 1px solid #CBD5E1; padding: 6px; font-size: 9pt; color: #64748B;">Hasil Bersih Masuk Kas</td>
            <td colspan="4" style="border: 1px solid #CBD5E1; padding: 6px; font-size: 9pt; color: #64748B;">Status Rekap Terintegrasi</td>
          </tr>
          <tr><td colspan="14" style="height: 16px;"></td></tr>
        </table>

        <table style="border: 1px solid #94A3B8;">
          <thead>
            <tr style="background-color: #0F2547; color: #FAF8F5;">
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: center;">No</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: left;">ID Pesanan</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: left;">Waktu WIB</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: left;">Nama Pembeli</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: left;">WhatsApp</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: left;">Kampus</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: left;">Titik Temu &amp; Catatan</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: left;">Rincian Menu</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: center;">Metode</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: right;">Gross (Rp)</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: right;">MDR QRIS (Rp)</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: right;">Net Bersih (Rp)</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: center;">Status</th>
              <th style="border: 1px solid #475569; padding: 10px; font-size: 10pt; text-align: center;">Bukti Foto</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="14" style="text-align: center; padding: 20px;">Belum ada transaksi.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background-color: #E2E8F0; font-weight: bold;">
              <td colspan="9" style="border: 1px solid #94A3B8; padding: 10px; text-align: right; font-size: 11pt; color: #0F2547;">
                TOTAL KESELURUHAN LUNAS:
              </td>
              <td style="border: 1px solid #94A3B8; padding: 10px; text-align: right; font-size: 11pt; color: #0F2547; mso-number-format:'#,##0';">
                ${totalGross}
              </td>
              <td style="border: 1px solid #94A3B8; padding: 10px; text-align: right; font-size: 11pt; color: #DC2626; mso-number-format:'#,##0';">
                -${totalMdr}
              </td>
              <td style="border: 1px solid #94A3B8; padding: 10px; text-align: right; font-size: 11pt; color: #059669; mso-number-format:'#,##0';">
                ${totalNet}
              </td>
              <td colspan="2" style="border: 1px solid #94A3B8; padding: 10px; text-align: center; font-size: 10pt; color: #0F2547;">
                ${paidOrders.length} TRANSAKSI LUNAS
              </td>
            </tr>
          </tfoot>
        </table>

        <table style="margin-top: 20px;">
          <tr>
            <td colspan="14" style="font-size: 9pt; color: #94A3B8; text-align: right; font-style: italic;">
              Laporan resmi Kedai BGN Bersatoe Tel-U. Digenerate otomatis oleh Sistem Operasional.
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-keuangan-bgn-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteOrder = async () => {
    if (deletePassword !== 'bgnsukses777') {
      setDeleteError('Password admin salah! Masukkan: bgnsukses777');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      if (isBulkDelete) {
        // Bulk delete all orders
        const res = await fetch('/api/orders', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: deletePassword }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setDeleteError(data.message || 'Gagal membersihkan data testing.');
          return;
        }

        setOrders([]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('bgn_recent_orders');
          } catch {
            /* silent */
          }
        }
      } else {
        // Delete single order
        if (!orderToDelete) return;
        const res = await fetch(`/api/orders/${orderToDelete.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: deletePassword }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setDeleteError(data.message || 'Gagal menghapus pesanan.');
          return;
        }

        setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`bgn_order_${orderToDelete.id}`);
            const cached: Order[] = JSON.parse(
              localStorage.getItem('bgn_recent_orders') || '[]'
            );
            const nextCached = cached.filter((o) => o.id !== orderToDelete.id);
            localStorage.setItem('bgn_recent_orders', JSON.stringify(nextCached));
          } catch {
            /* silent */
          }
        }
      }

      setDeleteModalOpen(false);
      setOrderToDelete(null);
      setIsBulkDelete(false);
      setDeletePassword('');
    } catch {
      setDeleteError('Terjadi kesalahan jaringan saat menghapus pesanan.');
    } finally {
      setIsDeleting(false);
    }
  };

  // RECAP LOGIC FOR KITCHEN & LOGISTICS
  const validRecapOrders = orders.filter(
    (o) => o.order_status !== 'CANCELLED' && o.order_status !== 'EXPIRED'
  );

  const recapDates = Array.from(
    new Set(
      validRecapOrders
        .map((o) => (o.scheduled_time || '').split(' pukul ')[0])
        .filter(Boolean)
    )
  );

  const displayedRecapOrders =
    selectedRecapDate === 'ALL'
      ? validRecapOrders
      : validRecapOrders.filter((o) => (o.scheduled_time || '').startsWith(selectedRecapDate));

  const portionCounts: Record<string, number> = {};
  displayedRecapOrders.forEach((o) => {
    (o.items || []).forEach((it) => {
      portionCounts[it.product_name] = (portionCounts[it.product_name] || 0) + it.quantity;
    });
  });

  const halimunRecapOrders = displayedRecapOrders.filter(
    (o) => o.campus_location === 'Kampus B Halimun'
  );
  const minangkabauRecapOrders = displayedRecapOrders.filter(
    (o) => o.campus_location === 'Kampus C Minangkabau'
  );

  const handleCopyWhatsAppRecap = () => {
    const dateLabel = selectedRecapDate === 'ALL' ? 'Semua Jadwal' : selectedRecapDate;
    let text = `📋 *REKAP OPERASIONAL DAPUR & KURIR - KEDAI BGN BERSATOE*\n`;
    text += `📅 Jadwal Pengantaran: *${dateLabel}*\n`;
    text += `📦 Total Antrean: *${displayedRecapOrders.length} Pesanan*\n\n`;
    text += `🍳 *TOTAL PORSI HARUS DIMASAK (DAPUR):*\n`;
    if (Object.keys(portionCounts).length === 0) {
      text += `(Belum ada pesanan masuk)\n`;
    } else {
      Object.entries(portionCounts).forEach(([name, count]) => {
        text += `• ${name}: *${count} porsi*\n`;
      });
    }
    text += `\n📍 *KAMPUS B HALIMUN (${halimunRecapOrders.length} antaran):*\n`;
    if (halimunRecapOrders.length === 0) {
      text += `- Tidak ada antaran\n`;
    } else {
      halimunRecapOrders.forEach((o, i) => {
        const items = (o.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ');
        const notes = o.order_notes ? ` [Catatan: ${o.order_notes}]` : '';
        const payStatus = o.payment_method === 'CASH' ? `Tagih Tunai Rp ${o.gross_amount.toLocaleString('id-ID')}` : 'QRIS Lunas';
        text += `${i + 1}. [${o.queue_number || o.order_code}] ${o.customer_name} (${o.customer_whatsapp}) | Jam ${o.scheduled_time.split(' pukul ')[1] || o.scheduled_time} | Titik: ${o.location_notes || '-'} | Menu: ${items}${notes} | ${payStatus}\n`;
      });
    }
    text += `\n📍 *KAMPUS C MINANGKABAU (${minangkabauRecapOrders.length} antaran):*\n`;
    if (minangkabauRecapOrders.length === 0) {
      text += `- Tidak ada antaran\n`;
    } else {
      minangkabauRecapOrders.forEach((o, i) => {
        const items = (o.items || []).map((it) => `${it.quantity}x ${it.product_name}`).join(', ');
        const notes = o.order_notes ? ` [Catatan: ${o.order_notes}]` : '';
        const payStatus = o.payment_method === 'CASH' ? `Tagih Tunai Rp ${o.gross_amount.toLocaleString('id-ID')}` : 'QRIS Lunas';
        text += `${i + 1}. [${o.queue_number || o.order_code}] ${o.customer_name} (${o.customer_whatsapp}) | Jam ${o.scheduled_time.split(' pukul ')[1] || o.scheduled_time} | Titik: ${o.location_notes || '-'} | Menu: ${items}${notes} | ${payStatus}\n`;
      });
    }
    text += `\nSemangat tim Kedai BGN Bersatoe! Siapkan pesanan tepat waktu & amanah.`;
    navigator.clipboard.writeText(text);
    setRecapCopied(true);
    setTimeout(() => setRecapCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-[#D4A843] bg-[#0A1628] shadow-xs">
              <Image
                src="/images/bgn-logo.jpg"
                alt="Logo Kedai BGN Bersatoe"
                width={40}
                height={40}
                className="object-cover w-full h-full"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-[#0F2547] tracking-tight">
                  KEDAI BGN BERSATOE
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#D4A843]/20 text-[#0F2547] border border-[#D4A843]/40">
                  EST. 1998
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Admin &amp; Operational Logistics Panel
              </div>
            </div>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#0F2547] transition-colors ml-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Lihat Toko
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5">
              {[
                { key: 'ORDERS', label: 'Pesanan Masuk' },
                { key: 'RECAP', label: 'Rekap Dapur & Kurir' },
                { key: 'SCHEDULE', label: 'Jadwal & Operasional' },
                { key: 'FINANCE', label: 'Rekap Keuangan' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as ActiveTab)}
                  className={`h-8 px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'ORDERS' && activeProcessingCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0F2547] text-[#D4A843] ring-1 ring-[#D4A843] text-[10px] font-black">
                      {activeProcessingCount}
                    </span>
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
        {/* TAB 1: PESANAN MASUK (DENGAN FILTER KAMPUS LOGISTIK & TOMBOL WA) */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            {/* Quick Campus Filter Pills for Logistics */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-1">
                  Logistik Kampus:
                </span>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFilter((f) => ({ ...f, campus: 'ALL' }))}
                    className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                      filter.campus === 'ALL'
                        ? 'bg-[#0F2547] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter((f) => ({ ...f, campus: 'Kampus B Halimun' }))}
                    className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                      filter.campus === 'Kampus B Halimun'
                        ? 'bg-[#0F2547] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kampus Halimun ({countHalimun})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter((f) => ({ ...f, campus: 'Kampus C Minangkabau' }))}
                    className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                      filter.campus === 'Kampus C Minangkabau'
                        ? 'bg-[#0F2547] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kampus Minangkabau ({countMinangkabau})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CustomSelect
                  value={filter.status}
                  onChange={(v) =>
                    setFilter((f) => ({ ...f, status: v as OrderFilter['status'] }))
                  }
                  options={STATUS_OPTIONS}
                />
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkDelete(true);
                    setOrderToDelete(null);
                    setDeletePassword('');
                    setDeleteError('');
                    setDeleteModalOpen(true);
                  }}
                  className="h-9 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Bersihkan Semua Data Pesanan Testing"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bersihkan Data Testing</span>
                </button>
                {hasFilter && (
                  <button
                    type="button"
                    onClick={() => setFilter({ campus: 'ALL', status: 'ALL' })}
                    className="h-9 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Orders Table (Fit Layar Penuh Tanpa Horizontal Scroll) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {isLoading ? (
                <div className="py-20 text-center flex flex-col items-center gap-2 text-sm text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-300" />
                  <span>Memuat pesanan...</span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-20 text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-400">Belum ada pesanan</p>
                  <p className="text-xs text-slate-300">
                    Pesanan dari pelanggan akan muncul secara otomatis di sini.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-hidden">
                  <table className="w-full text-left table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="w-[20%] px-3 py-3">Antrean &amp; Pemesan</th>
                        <th className="w-[24%] px-3 py-3">Pengantaran &amp; Titik Temu</th>
                        <th className="w-[22%] px-3 py-3">Menu Pesanan</th>
                        <th className="w-[16%] px-3 py-3">Total &amp; Bayar</th>
                        <th className="w-[18%] px-3 py-3">Status &amp; Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredOrders.map((order) => {
                        const phone = formatTo62Phone(order.customer_whatsapp);
                        const campusShort =
                          CAMPUS_LABELS[order.campus_location] || order.campus_location;

                        // Pre-filled WhatsApp notification message
                        const waMessage = `Halo kak ${order.customer_name}! Pesanan Kedai BGN kamu (${order.order_code}) sudah hampir sampai nih di titik temu ${campusShort} (${order.location_notes || '-'}). Siap-siap untuk ambil yaa! Terima kasih.`;
                        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
                          waMessage
                        )}`;

                        const next = nextStatusMap[order.order_status];
                        const isUpdating = isUpdatingStatus === order.id;
                        const isCashOrder = order.payment_method === 'CASH';
                        const isWaitingOrPending =
                          order.order_status === 'WAITING_PAYMENT' ||
                          (order.order_status as string) === 'PENDING';
                        const proofUrl =
                          order.delivery_proof_url ||
                          (order.payments?.[0]?.deeplink_url?.startsWith('http')
                            ? order.payments[0].deeplink_url
                            : null);

                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-slate-50/60 transition-colors align-top"
                          >
                            {/* Kolom 1: Antrean & Pemesan */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-[#0F2547]">
                                  {order.queue_number || '-'}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {order.order_code}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 mt-1 truncate" title={order.customer_name}>
                                {order.customer_name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-slate-500 font-mono truncate">
                                  {order.customer_whatsapp}
                                </span>
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 inline-flex items-center justify-center shrink-0"
                                  title="Chat WhatsApp Pelanggan"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </a>
                              </div>
                            </td>

                            {/* Kolom 2: Pengantaran & Titik Temu */}
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    CAMPUS_COLORS[order.campus_location] ||
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  <MapPin className="w-2.5 h-2.5" />
                                  {campusShort}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                  <Clock className="w-2.5 h-2.5 text-[#0F2547]" />
                                  <span>{order.scheduled_time.split(' pukul ')[1] || order.scheduled_time}</span>
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-700 font-medium mt-1 leading-snug">
                                <span className="text-slate-400">Titik: </span>
                                <span>{order.location_notes || '-'}</span>
                              </div>
                              {order.order_notes && (
                                <div className="mt-1 text-[10px] text-amber-800 bg-amber-50 rounded-md px-1.5 py-0.5 border border-amber-200/60 leading-tight">
                                  <strong>Catatan:</strong> {order.order_notes}
                                </div>
                              )}
                            </td>

                            {/* Kolom 3: Menu Pesanan */}
                            <td className="px-3 py-3">
                              <div className="space-y-1">
                                {order.items?.map((it) => (
                                  <div key={it.id || it.product_id} className="text-xs text-slate-800 leading-snug">
                                    <span className="font-bold text-[#0F2547]">{it.quantity}x</span>{' '}
                                    <span>{it.product_name}</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* Kolom 4: Total & Bayar */}
                            <td className="px-3 py-3">
                              <div className="text-xs font-black text-slate-900">
                                {formatIDR(order.gross_amount)}
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <span
                                  className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                    order.payment_method === 'CASH'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-blue-100 text-blue-800 border-blue-300'
                                  }`}
                                >
                                  {order.payment_method}
                                </span>
                              </div>
                              {/* Tombol Lihat Foto Bukti jika ada */}
                              {proofUrl && (
                                <button
                                  type="button"
                                  onClick={() => setViewingProofUrl(proofUrl)}
                                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Lihat Foto Bukti Serah Terima Makanan"
                                >
                                  <Camera className="w-3 h-3 text-emerald-600" />
                                  <span>Foto Bukti</span>
                                </button>
                              )}
                            </td>

                            {/* Kolom 5: Status & Aksi */}
                            <td className="px-3 py-3">
                              <div className="flex items-start gap-1.5">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <span className={statusPill(order.order_status)}>
                                    {statusLabel(order.order_status, order.payment_method)}
                                  </span>

                                  {/* Khusus COD / CASH yang Menunggu Bayar: Wajib Upload Bukti Foto */}
                                  {isCashOrder && isWaitingOrPending ? (
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenProofModal(order)}
                                        className="h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow-xs active:scale-95"
                                        title="Konfirmasi Lunas & Upload Foto Serah Terima"
                                      >
                                        <Camera className="w-3 h-3 text-white" />
                                        <span>Konfirmasi Lunas</span>
                                      </button>
                                    </div>
                                  ) : next ? (
                                    <div>
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateStatus(order.id, next.value)}
                                        className="h-7 px-2.5 rounded-lg bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 disabled:opacity-50 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                      >
                                        {isUpdating ? (
                                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                        ) : (
                                          <Check className="w-2.5 h-2.5 text-[#D4A843]" />
                                        )}
                                        {next.label}
                                      </button>
                                    </div>
                                  ) : null}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsBulkDelete(false);
                                    setOrderToDelete(order);
                                    setDeletePassword('');
                                    setDeleteError('');
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors shadow-xs shrink-0"
                                  title="Hapus Pesanan Testing (Perlu Password Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

        {/* TAB 2: REKAP DAPUR & KURIR LOGISTIK (AGREGAT PORSI & MANIFEST ANTARAN) */}
        {activeTab === 'RECAP' && (
          <div className="space-y-6">
            {/* Action Bar & Date Filter */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#0F2547]" />
                <div>
                  <h3 className="font-extrabold text-sm text-[#0F2547]">
                    Rekap Operasional Dapur &amp; Kurir
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Agregat porsi masak untuk koki dan manifest rute antaran untuk kurir
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Date Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400 font-medium">Jadwal:</span>
                  <select
                    value={selectedRecapDate}
                    onChange={(e) => setSelectedRecapDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Jadwal ({validRecapOrders.length})</option>
                    {recapDates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Copy to WhatsApp Group Button */}
                <button
                  type="button"
                  onClick={handleCopyWhatsAppRecap}
                  className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
                >
                  {recapCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-amber-300" />
                      <span>Tersalin ke Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Rekap WA Grup</span>
                    </>
                  )}
                </button>

                {/* Print Manifest Button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-8 px-3 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D4A843]" />
                  <span>Cetak Manifest</span>
                </button>
              </div>
            </div>

            {/* SECTION A: KITCHEN PRODUCTION TARGET (BERAPA PORSI HARUS DIMASAK) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4A843]" />
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Total Porsi Masak Tim Dapur
                  </h4>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Target: {displayedRecapOrders.length} Antrean Pesanan
                </span>
              </div>

              {Object.keys(portionCounts).length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Belum ada pesanan aktif pada jadwal yang dipilih.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(portionCounts).map(([name, count]) => (
                    <div
                      key={name}
                      className="bg-gradient-to-br from-slate-50 to-amber-50/40 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between"
                    >
                      <span className="text-xs font-bold text-slate-700 leading-snug">{name}</span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-[#0F2547]">{count}</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Porsi / Btl</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION B: DELIVERY MANIFEST BY CAMPUS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kampus B Halimun Column */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="bg-violet-900 text-white p-3.5 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#D4A843]" />
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      Manifest Kampus B Halimun
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    {halimunRecapOrders.length} Antaran
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[550px] divide-y divide-slate-100">
                  {halimunRecapOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Tidak ada antaran untuk Kampus Halimun pada jadwal ini.
                    </p>
                  ) : (
                    halimunRecapOrders.map((o, idx) => {
                      const isCash = o.payment_method === 'CASH';
                      const itemsStr = (o.items || [])
                        .map((it) => `${it.quantity}x ${it.product_name}`)
                        .join(', ');
                      return (
                        <div key={o.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-xs text-[#0F2547]">
                              #{idx + 1} [{o.queue_number || o.order_code}]
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#0F2547]" />
                              {o.scheduled_time.split(' pukul ')[1] || o.scheduled_time}
                            </span>
                          </div>

                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{o.customer_name}</span>
                            <a
                              href={`https://wa.me/${formatTo62Phone(o.customer_whatsapp)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                            >
                              <span>{o.customer_whatsapp}</span>
                            </a>
                          </div>

                          <p className="text-[11px] text-slate-600">
                            <strong>Titik Temu:</strong> {o.location_notes || '-'}
                          </p>

                          <p className="text-[11px] text-slate-700 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <strong>Menu:</strong> {itemsStr}
                          </p>

                          {o.order_notes && (
                            <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                              <strong>Catatan:</strong> {o.order_notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isCash
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              {isCash
                                ? `Tagih Tunai: ${formatIDR(o.gross_amount)}`
                                : `QRIS Lunas (${formatIDR(o.gross_amount)})`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Kampus C Minangkabau Column */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="bg-sky-900 text-white p-3.5 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#D4A843]" />
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      Manifest Kampus C Minangkabau
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    {minangkabauRecapOrders.length} Antaran
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[550px] divide-y divide-slate-100">
                  {minangkabauRecapOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Tidak ada antaran untuk Kampus Minangkabau pada jadwal ini.
                    </p>
                  ) : (
                    minangkabauRecapOrders.map((o, idx) => {
                      const isCash = o.payment_method === 'CASH';
                      const itemsStr = (o.items || [])
                        .map((it) => `${it.quantity}x ${it.product_name}`)
                        .join(', ');
                      return (
                        <div key={o.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-xs text-[#0F2547]">
                              #{idx + 1} [{o.queue_number || o.order_code}]
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#0F2547]" />
                              {o.scheduled_time.split(' pukul ')[1] || o.scheduled_time}
                            </span>
                          </div>

                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{o.customer_name}</span>
                            <a
                              href={`https://wa.me/${formatTo62Phone(o.customer_whatsapp)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                            >
                              <span>{o.customer_whatsapp}</span>
                            </a>
                          </div>

                          <p className="text-[11px] text-slate-600">
                            <strong>Titik Temu:</strong> {o.location_notes || '-'}
                          </p>

                          <p className="text-[11px] text-slate-700 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <strong>Menu:</strong> {itemsStr}
                          </p>

                          {o.order_notes && (
                            <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                              <strong>Catatan:</strong> {o.order_notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isCash
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              {isCash
                                ? `Tagih Tunai: ${formatIDR(o.gross_amount)}`
                                : `QRIS Lunas (${formatIDR(o.gross_amount)})`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'SCHEDULE' && (
          <div className="space-y-6">
            {settingsSavedMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 animate-in fade-in">
                {settingsSavedMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Pengaturan Tanggal Libur */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CalendarOff className="w-5 h-5 text-rose-600" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Tanggal Libur Tambahan</h3>
                    <p className="text-xs text-slate-500">
                      Sabtu dan Minggu sudah otomatis libur. Tambahkan tanggal merah / libur kampus di sini.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newHolidayInput}
                    onChange={(e) => setNewHolidayInput(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0F2547]"
                  />
                  <button
                    type="button"
                    onClick={handleAddHoliday}
                    disabled={!newHolidayInput || isSavingSettings}
                    className="h-9 px-3.5 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Libur</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {settings.holidays.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      Belum ada tanggal libur tambahan yang diatur.
                    </p>
                  ) : (
                    settings.holidays.map((h) => (
                      <div
                        key={h}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <span className="font-mono font-semibold text-slate-700">{h}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHoliday(h)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Hapus Tanggal Libur"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Card 2: Pengaturan Jam Pengantaran */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Clock className="w-5 h-5 text-[#0F2547]" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Jam Pengantaran Aktif</h3>
                    <p className="text-xs text-slate-500">
                      Pilihan jam yang dapat dipilih oleh pembeli saat checkout.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: 12:00 WIB"
                    value={newSlotInput}
                    onChange={(e) => setNewSlotInput(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0F2547]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTimeSlot}
                    disabled={!newSlotInput || isSavingSettings}
                    className="h-9 px-3.5 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Jam</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                  {settings.activeTimeSlots.map((slot) => (
                    <div
                      key={slot}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <span className="font-bold text-slate-800">{slot}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTimeSlot(slot)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Hapus Jam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Status Menu (Buka / Tutup Menu) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 pb-2 border-b border-slate-100">
                Status Ketersediaan Menu
              </h3>
              <div className="divide-y divide-slate-100">
                {products.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                      <p className="text-[11px] text-slate-500">{formatIDR(p.price)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleProduct(p.id, p.is_available)}
                      className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-colors ${
                        p.is_available
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      {p.is_available ? 'Menu Aktif (Tersedia)' : 'Menu Nonaktif (Tutup)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REKAP KEUANGAN TERINTEGRASI */}
        {activeTab === 'FINANCE' && (
          <div className="space-y-5">
            {/* KPI Cards Ringkasan Eksekutif */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
                <p className="text-xs text-slate-500 font-medium">Total Omzet Masuk (Lunas)</p>
                <p className="text-xl font-black text-slate-900">{formatIDR(totalGross)}</p>
                <p className="text-[11px] text-emerald-600 font-bold">{paidOrders.length} transaksi sudah lunas</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
                <p className="text-xs text-slate-500 font-medium">Potensi Omzet Pending</p>
                <p className="text-xl font-black text-amber-600">{formatIDR(totalPendingGross)}</p>
                <p className="text-[11px] text-amber-700 font-medium">{pendingOrders.length} pesanan belum lunas</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
                <p className="text-xs text-slate-500 font-medium">Potongan MDR QRIS</p>
                <p className="text-xl font-black text-rose-600">{formatIDR(totalMdr)}</p>
                <p className="text-[11px] text-slate-400">Tarif 0,7% QRIS (Cash 0%)</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
                <p className="text-xs text-slate-500 font-medium">Pendapatan Bersih (Net)</p>
                <p className="text-xl font-black text-emerald-600">{formatIDR(totalNet)}</p>
                <p className="text-[11px] text-slate-400">Kas bersih setelah MDR</p>
              </div>
            </div>

            {/* Tabel Riwayat Keuangan */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Riwayat Transaksi Keuangan</h3>
                    <p className="text-[11px] text-slate-400">
                      Seluruh transaksi pesanan masuk, lunas, dan menunggu pembayaran
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setFinanceFilter('ALL')}
                      className={`h-7 px-2.5 rounded-lg font-bold transition-all ${
                        financeFilter === 'ALL'
                          ? 'bg-[#0F2547] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua ({validFinanceOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinanceFilter('PAID')}
                      className={`h-7 px-2.5 rounded-lg font-bold transition-all ${
                        financeFilter === 'PAID'
                          ? 'bg-[#0F2547] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Lunas ({paidOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinanceFilter('PENDING')}
                      className={`h-7 px-2.5 rounded-lg font-bold transition-all ${
                        financeFilter === 'PENDING'
                          ? 'bg-[#0F2547] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Menunggu Bayar ({pendingOrders.length})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcelFormatted}
                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
                    title="Export Laporan Format Excel (.xls) dengan Tabel Rapi & Ringkasan"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel (.xls)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Export format CSV data mentah"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {displayedFinanceOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-400">Tidak ada data transaksi pada kategori ini.</p>
                </div>
              ) : (
                <div className="w-full overflow-hidden">
                  <table className="w-full text-left table-fixed text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="w-[14%] px-3 py-3">ID &amp; Waktu</th>
                        <th className="w-[18%] px-3 py-3">Pembeli &amp; Kampus</th>
                        <th className="w-[20%] px-3 py-3">Menu Pesanan</th>
                        <th className="w-[12%] px-3 py-3">Metode &amp; Bukti</th>
                        <th className="w-[12%] px-3 py-3 text-right">Gross (Rp)</th>
                        <th className="w-[10%] px-3 py-3 text-right">MDR (Rp)</th>
                        <th className="w-[14%] px-3 py-3 text-right">Net / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedFinanceOrders.map((o) => {
                        const isPaid = [...PROCESSING_STATUSES, ...DONE_STATUSES].includes(o.order_status);
                        const isCash = o.payment_method === 'CASH';
                        const mdrFee = isPaid
                          ? isCash
                            ? 0
                            : o.payments?.[0]?.mdr_fee_amount ??
                              Math.round((o.gross_amount || 0) * 0.007)
                          : 0;
                        const netRev = isPaid ? (o.gross_amount || 0) - mdrFee : 0;
                        const itemsStr = (o.items || [])
                          .map((it) => `${it.quantity}x ${it.product_name}`)
                          .join(', ');
                        const proof =
                          o.delivery_proof_url ||
                          (o.payments?.[0]?.deeplink_url?.startsWith('http')
                            ? o.payments[0].deeplink_url
                            : null);

                        return (
                          <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-3 py-3 align-top">
                              <div className="font-mono font-bold text-[#0F2547]">
                                {o.order_code}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {formatWIB(o.created_at)}
                              </div>
                            </td>

                            <td className="px-3 py-3 align-top">
                              <div className="font-semibold text-slate-800 truncate" title={o.customer_name}>
                                {o.customer_name}
                              </div>
                              <div className="mt-1">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                    CAMPUS_COLORS[o.campus_location] ||
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {CAMPUS_LABELS[o.campus_location] || o.campus_location}
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-3 align-top">
                              <p className="text-slate-600 line-clamp-2 leading-snug" title={itemsStr}>
                                {itemsStr}
                              </p>
                            </td>

                            <td className="px-3 py-3 align-top">
                              <span
                                className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                  isCash
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-300'
                                }`}
                              >
                                {o.payment_method}
                              </span>
                              {proof && (
                                <div className="mt-1">
                                  <button
                                    type="button"
                                    onClick={() => setViewingProofUrl(proof)}
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200"
                                    title="Lihat foto bukti"
                                  >
                                    <Camera className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Bukti Foto</span>
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3 align-top text-right font-bold text-slate-900">
                              {formatIDR(o.gross_amount)}
                            </td>

                            <td className="px-3 py-3 align-top text-right text-rose-500 font-mono">
                              {isPaid ? `-${formatIDR(mdrFee)}` : 'Rp 0'}
                            </td>

                            <td className="px-3 py-3 align-top text-right">
                              {isPaid ? (
                                <div>
                                  <div className="font-black text-emerald-600">
                                    {formatIDR(netRev)}
                                  </div>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Lunas
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-bold text-amber-600 italic">
                                    Pending
                                  </div>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Menunggu Bayar
                                  </span>
                                </div>
                              )}
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

        {/* Modal Konfirmasi Hapus Data Testing */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isBulkDelete ? 'Bersihkan Semua Data Testing' : 'Hapus Pesanan Testing'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verifikasi otorisasi admin diperlukan
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-800 space-y-1">
                <p className="font-bold">Perhatian: Tindakan ini permanen!</p>
                {isBulkDelete ? (
                  <p className="text-rose-700 leading-relaxed">
                    Semua data pesanan testing yang ada saat ini ({orders.length} pesanan) akan dihapus secara permanen dari database Supabase dan sistem antrean.
                  </p>
                ) : (
                  <p className="text-rose-700 leading-relaxed">
                    Pesanan <span className="font-mono font-black">{orderToDelete?.order_code}</span> atas nama <span className="font-bold">{orderToDelete?.customer_name}</span> ({orderToDelete ? formatIDR(orderToDelete.gross_amount) : ''}) akan dihapus permanen.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Password Admin</span>
                  <span className="text-[10px] text-slate-400">Ketik: bgnsukses777</span>
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password admin (bgnsukses777)"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDeleteOrder();
                  }}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50"
                  autoFocus
                />
                {deleteError && (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                    <span>•</span>
                    <span>{deleteError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setOrderToDelete(null);
                    setIsBulkDelete(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  disabled={isDeleting}
                  className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={isDeleting || !deletePassword}
                  className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isBulkDelete ? 'Hapus Semua' : 'Hapus Pesanan'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Pembayaran Tunai & Upload Bukti Penerimaan (COD) */}
        {proofModalOpen && orderForProof && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-emerald-700">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Konfirmasi Serah Terima &amp; Pelunasan COD
                  </h3>
                  <p className="text-xs text-slate-400">
                    Wajib foto bukti pembeli menerima makanan dan menyerahkan uang tunai
                  </p>
                </div>
              </div>

              {/* Ringkasan Pesanan */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kode &amp; Pemesan:</span>
                  <span className="font-bold text-slate-900">{orderForProof.order_code} - {orderForProof.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Titik Temu:</span>
                  <span className="font-semibold text-slate-800">
                    {CAMPUS_LABELS[orderForProof.campus_location] || orderForProof.campus_location} ({orderForProof.location_notes || '-'})
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Total Uang Tunai Diterima:</span>
                  <span className="font-black text-sm text-[#0F2547]">{formatIDR(orderForProof.gross_amount)}</span>
                </div>
              </div>

              {/* Area Upload Foto Bukti */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Foto Bukti Penerimaan Makanan</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">*Wajib Diunggah</span>
                </label>

                {proofPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-100 text-center">
                    <img
                      src={proofPreview}
                      alt="Preview Bukti Penerimaan"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-bold cursor-pointer transition-colors backdrop-blur-xs flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Ganti Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileSelectProof}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Klik untuk Ambil Foto dari Kamera atau Pilih File
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Foto makanan yang diterima pembeli sebagai bukti fisik serah terima
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelectProof}
                      className="hidden"
                    />
                  </label>
                )}

                {proofError && (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                    <span>•</span>
                    <span>{proofError}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setProofModalOpen(false);
                    setOrderForProof(null);
                    setProofPreview(null);
                    setProofError('');
                  }}
                  disabled={isUploadingProof}
                  className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCashProof}
                  disabled={isUploadingProof || !proofPreview}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {isUploadingProof ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah &amp; Memproses...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan Bukti &amp; Tandai Lunas</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Lightbox Penampil Foto Bukti Serah Terima */}
        {viewingProofUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in cursor-pointer"
            onClick={() => setViewingProofUrl(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-3 cursor-default p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Foto Bukti Serah Terima Makanan</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingProofUrl(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center max-h-[70vh]">
                <img
                  src={viewingProofUrl}
                  alt="Bukti Serah Terima Makanan"
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-400">Dokumentasi fisik resmi Kedai BGN Bersatoe</span>
                <a
                  href={viewingProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0F2547] hover:underline"
                >
                  <span>Buka Gambar Asli</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
