'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Receipt,
  Minus,
} from 'lucide-react';
import { Order, OrderStatus, Product, CampusLocation, OperationalSettings } from '@/types';
import { formatIDR, formatWIB, formatTo62Phone } from '@/lib/formatters';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import CustomDatePicker from '@/components/CustomDatePicker';

type ActiveTab = 'ORDERS' | 'RECAP' | 'SCHEDULE' | 'FINANCE';
type OrderFilter = {
  campus: 'ALL' | CampusLocation;
  status: 'ALL' | 'WAITING' | 'PROCESSING' | 'DONE';
  date: string;
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
    return paymentMethod === 'CASH' ? 'Menunggu Bayar (CASH)' : 'Menunggu Bayar (QRIS)';
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
  icon,
  align = 'left',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
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
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between gap-2 min-w-[130px] transition-colors shadow-xs cursor-pointer"
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          <span className="truncate">{cur?.label || value}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-full w-max max-w-[320px] overflow-hidden text-xs`}
        >
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
  const [filter, setFilter] = useState<OrderFilter>({ campus: 'ALL', status: 'ALL', date: 'ALL' });
  const hasFilter = filter.campus !== 'ALL' || filter.status !== 'ALL' || filter.date !== 'ALL';

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
  const [holidayWarning, setHolidayWarning] = useState('');
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

  // Manual / OTS Order Modal state (Input Pesanan Hari Lampau & OTS)
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDate, setManualDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [manualTime, setManualTime] = useState('12:00 WIB');
  const [manualCampus, setManualCampus] = useState<CampusLocation>('Kampus C Minangkabau');
  const [manualLocationNotes, setManualLocationNotes] = useState('Penjualan Langsung di Tempat (OTS)');
  const [manualCustomerName, setManualCustomerName] = useState('Pembeli Langsung (OTS)');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'CASH' | 'QRIS'>('CASH');
  const [manualItemQuantities, setManualItemQuantities] = useState<Record<string, number>>({});
  const [manualItemOptions, setManualItemOptions] = useState<Record<string, Record<string, string>>>({
    'prod-003': { 'Level Gula': 'Dengan Gula' },
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');

  const handleOpenManualModal = () => {
    const d = new Date();
    setManualDate(d.toISOString().split('T')[0]);
    setManualTime('12:00 WIB');
    setManualCampus('Kampus C Minangkabau');
    setManualLocationNotes('Penjualan Langsung di Tempat (OTS)');
    setManualCustomerName('Pembeli Langsung (OTS)');
    setManualCustomerPhone('');
    setManualPaymentMethod('CASH');
    const initQtys: Record<string, number> = {};
    const defaultOpts: Record<string, Record<string, string>> = {};
    products.forEach((p) => {
      initQtys[p.id] = 0;
      if (p.variants && p.variants.length > 0) {
        defaultOpts[p.id] = {};
        p.variants.forEach((v) => {
          defaultOpts[p.id][v.group_name] = v.options[0] || '';
        });
      }
    });
    setManualItemQuantities(initQtys);
    setManualItemOptions(defaultOpts);
    setManualError('');
    setManualSuccessMsg('');
    setManualModalOpen(true);
  };

  const handleUpdateManualItemQty = (prodId: string, delta: number) => {
    setManualItemQuantities((prev) => {
      const current = prev[prodId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [prodId]: next };
    });
  };

  const manualTotalAmount = useMemo(() => {
    return products.reduce((acc, p) => {
      const qty = manualItemQuantities[p.id] || 0;
      return acc + p.price * qty;
    }, 0);
  }, [products, manualItemQuantities]);

  const handleSubmitManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    setManualSuccessMsg('');

    const itemsToSubmit = Object.entries(manualItemQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        product_id: productId,
        quantity: qty,
        selected_options: manualItemOptions[productId] || {},
      }));

    if (itemsToSubmit.length === 0) {
      setManualError('Pilih minimal 1 porsi menu masakan.');
      return;
    }

    setIsSubmittingManual(true);
    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_date: manualDate,
          transaction_time: manualTime,
          campus_location: manualCampus,
          location_notes: manualLocationNotes || 'Penjualan Langsung di Tempat (OTS)',
          customer_name: manualCustomerName || 'Pembeli Langsung (OTS)',
          customer_whatsapp: manualCustomerPhone || '080000000000',
          payment_method: manualPaymentMethod,
          items: itemsToSubmit,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setManualSuccessMsg('Pesanan manual berhasil dicatat dan masuk ke rekap keuangan!');
        setTimeout(() => {
          setManualModalOpen(false);
          setFilter({ campus: 'ALL', status: 'ALL', date: 'ALL' });
          fetchOrders();
        }, 900);
      } else {
        setManualError(data.message || 'Gagal menyimpan pesanan manual.');
      }
    } catch {
      setManualError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

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

  const formatHolidayLabel = (isoDate: string) => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
    const [y, m, d] = isoDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleAddHoliday = () => {
    setHolidayWarning('');
    if (!newHolidayInput) return;
    if (settings.holidays.includes(newHolidayInput)) {
      setHolidayWarning('Tanggal ini sudah ada dalam daftar libur.');
      setTimeout(() => setHolidayWarning(''), 3000);
      return;
    }
    const [y, m, d] = newHolidayInput.split('-').map(Number);
    const checkDate = new Date(y, m - 1, d);
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 5 || dayOfWeek === 6) {
      setHolidayWarning('Hari Senin, Jumat, Sabtu, dan Minggu sudah otomatis libur operasional (Kedai hanya buka Selasa s/d Kamis).');
      setTimeout(() => setHolidayWarning(''), 3500);
      return;
    }
    const nextHolidays = [...settings.holidays, newHolidayInput].sort();
    const nextSettings = { ...settings, holidays: nextHolidays };
    setSettings(nextSettings);
    setNewHolidayInput('');
    handleSaveSettings(nextSettings);
  };

  const handleRemoveHoliday = (h: string) => {
    setHolidayWarning('');
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

  // Unique scheduled dates from incoming active orders for date filter
  const orderDates = useMemo(() => {
    return Array.from(
      new Set(
        orders
          .filter((o) => o.order_status !== 'CANCELLED' && o.order_status !== 'EXPIRED')
          .map((o) => (o.scheduled_time || '').split(' pukul ')[0].trim())
          .filter(Boolean)
      )
    );
  }, [orders]);

  const DATE_OPTIONS: SelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Semua Tanggal' },
      ...orderDates.map((d) => ({ value: d, label: d })),
    ];
  }, [orderDates]);

  const handleDateChange = (newDate: string) => {
    setFilter((f) => ({ ...f, date: newDate }));
    setSelectedRecapDate(newDate);
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
    if (filter.date !== 'ALL') {
      const orderDate = (o.scheduled_time || '').split(' pukul ')[0].trim();
      if (orderDate !== filter.date) return false;
    }
    return true;
  });

  // Portion calculation for kitchen target based on active date and campus filter
  const kitchenTargetOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.order_status === 'CANCELLED' || o.order_status === 'EXPIRED') return false;
      if (filter.campus !== 'ALL' && o.campus_location !== filter.campus) return false;
      if (filter.date !== 'ALL') {
        const orderDate = (o.scheduled_time || '').split(' pukul ')[0].trim();
        if (orderDate !== filter.date) return false;
      }
      return true;
    });
  }, [orders, filter.campus, filter.date]);

  const kitchenPortionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    kitchenTargetOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const name = it.product_name || (it as unknown as { name?: string }).name || 'Menu';
        counts[name] = (counts[name] || 0) + (it.quantity || 1);
      });
    });
    return counts;
  }, [kitchenTargetOrders]);

  const totalKitchenPortions = useMemo(() => {
    return Object.values(kitchenPortionCounts).reduce((acc, c) => acc + c, 0);
  }, [kitchenPortionCounts]);

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
    const pMethod = o.payment_method || o.payments?.[0]?.payment_method || 'CASH';
    if (pMethod === 'CASH') return acc;
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
          newStatus: orderForProof.order_status === 'WAITING_PAYMENT' ? 'PAID' : orderForProof.order_status,
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
        prev.map((o) =>
          o.id === orderForProof.id || o.order_code === orderForProof.order_code
            ? { ...o, ...updatedOrder }
            : o
        )
      );

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`bgn_order_${orderForProof.id}`, JSON.stringify(updatedOrder));
          const cached: Order[] = JSON.parse(
            localStorage.getItem('bgn_recent_orders') || '[]'
          );
          const nextCached = cached.map((o) =>
            o.id === orderForProof.id || o.order_code === orderForProof.order_code
              ? { ...o, ...updatedOrder }
              : o
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
      'Waktu Order',
      'Jadwal Pengantaran',
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
      const pMethod = o.payment_method || o.payments?.[0]?.payment_method || 'CASH';
      const isCash = pMethod === 'CASH';
      const mdrFee = isPaid
        ? isCash
          ? 0
          : o.payments?.[0]?.mdr_fee_amount ?? Math.round((o.gross_amount || 0) * 0.007)
        : 0;
      const netRev = isPaid ? (o.gross_amount || 0) - mdrFee : 0;
      const items = (o.items || [])
        .map((it) => {
          const optStr =
            it.selected_options && Object.keys(it.selected_options).length > 0
              ? ` (${Object.values(it.selected_options).join(', ')})`
              : '';
          return `${it.quantity}x ${it.product_name}${optStr}`;
        })
        .join('; ');
      const proof = o.delivery_proof_url || o.payments?.[0]?.deeplink_url || '-';
      return [
        o.order_code,
        formatWIB(o.created_at),
        `"${o.scheduled_time || '-'}"`,
        `"${o.customer_name}"`,
        `"${o.customer_whatsapp}"`,
        `"${o.campus_location}"`,
        `"${items}"`,
        pMethod,
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
      .filter((o) => (o.payment_method || o.payments?.[0]?.payment_method || 'CASH') === 'CASH')
      .reduce((acc, o) => acc + (o.gross_amount || 0), 0);
    const totalQrisGross = paidOrders
      .filter((o) => (o.payment_method || o.payments?.[0]?.payment_method || 'CASH') !== 'CASH')
      .reduce((acc, o) => acc + (o.gross_amount || 0), 0);

    const rowsHtml = displayedFinanceOrders
      .map((o, idx) => {
        const isPaid = [...PROCESSING_STATUSES, ...DONE_STATUSES].includes(o.order_status);
        const pMethod = o.payment_method || o.payments?.[0]?.payment_method || 'CASH';
        const isCash = pMethod === 'CASH';
        const mdrFee = isPaid
          ? isCash
            ? 0
            : o.payments?.[0]?.mdr_fee_amount ?? Math.round((o.gross_amount || 0) * 0.007)
          : 0;
        const netRev = isPaid ? (o.gross_amount || 0) - mdrFee : 0;
        const items = (o.items || [])
          .map((it) => {
            const optStr =
              it.selected_options && Object.keys(it.selected_options).length > 0
                ? ` (${Object.values(it.selected_options).join(', ')})`
                : '';
            return `${it.quantity}x ${it.product_name}${optStr}`;
          })
          .join(', ');
        const campus = CAMPUS_LABELS[o.campus_location] || o.campus_location;
        const notes = [o.scheduled_time ? `Jadwal: ${o.scheduled_time}` : '', o.location_notes, o.order_notes].filter(Boolean).join(' | ');
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
            <td style="border: 1px solid #CBD5E1; padding: 8px; text-align: center; font-weight: bold;">${pMethod}</td>
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
    if (deletePassword !== 'bgnsukses123') {
      setDeleteError('Password admin salah!');
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

  const recapDateOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: `Semua Jadwal (${validRecapOrders.length})` },
      ...recapDates.map((d) => {
        const count = validRecapOrders.filter((o) => (o.scheduled_time || '').startsWith(d)).length;
        return {
          value: d,
          label: `${d} (${count})`,
        };
      }),
    ];
  }, [recapDates, validRecapOrders]);

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
        const items = (o.items || [])
          .map((it) => {
            const optStr =
              it.selected_options && Object.keys(it.selected_options).length > 0
                ? ` (${Object.values(it.selected_options).join(', ')})`
                : '';
            return `${it.quantity}x ${it.product_name}${optStr}`;
          })
          .join(', ');
        const notes = o.order_notes ? ` [Catatan: ${o.order_notes}]` : '';
        const pMethod = o.payment_method || o.payments?.[0]?.payment_method || 'CASH';
        const payStatus = pMethod === 'CASH' ? `Tagih Tunai Rp ${o.gross_amount.toLocaleString('id-ID')}` : 'QRIS Lunas';
        text += `${i + 1}. [${o.queue_number || o.order_code}] ${o.customer_name} (${o.customer_whatsapp}) | Jadwal: ${o.scheduled_time} | Titik: ${o.location_notes || '-'} | Menu: ${items}${notes} | ${payStatus}\n`;
      });
    }
    text += `\n📍 *KAMPUS C MINANGKABAU (${minangkabauRecapOrders.length} antaran):*\n`;
    if (minangkabauRecapOrders.length === 0) {
      text += `- Tidak ada antaran\n`;
    } else {
      minangkabauRecapOrders.forEach((o, i) => {
        const items = (o.items || [])
          .map((it) => {
            const optStr =
              it.selected_options && Object.keys(it.selected_options).length > 0
                ? ` (${Object.values(it.selected_options).join(', ')})`
                : '';
            return `${it.quantity}x ${it.product_name}${optStr}`;
          })
          .join(', ');
        const notes = o.order_notes ? ` [Catatan: ${o.order_notes}]` : '';
        const pMethod = o.payment_method || o.payments?.[0]?.payment_method || 'CASH';
        const payStatus = pMethod === 'CASH' ? `Tagih Tunai Rp ${o.gross_amount.toLocaleString('id-ID')}` : 'QRIS Lunas';
        text += `${i + 1}. [${o.queue_number || o.order_code}] ${o.customer_name} (${o.customer_whatsapp}) | Jadwal: ${o.scheduled_time} | Titik: ${o.location_notes || '-'} | Menu: ${items}${notes} | ${payStatus}\n`;
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
          {/* Mobile Header Layout (sm:hidden) */}
          <div className="flex sm:hidden flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-[#D4A843] bg-[#0A1628] shadow-xs">
                  <Image
                    src="/images/bgn-logo.jpg"
                    alt="Logo Kedai BGN Bersatoe"
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                    priority
                  />
                </div>
                <div className="leading-tight min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-xs text-[#0F2547] tracking-tight truncate">
                      KEDAI BGN BERSATOE
                    </span>
                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-[#D4A843]/20 text-[#0F2547] border border-[#D4A843]/40 shrink-0">
                      EST. 1998
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    Admin &amp; Operational Logistics Panel
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href="/"
                  className="h-7 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 flex items-center gap-1 transition-colors shadow-2xs"
                  title="Lihat Halaman Toko"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Toko</span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Keluar dari sesi Admin"
                  className="h-7 px-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>

            {/* Mobile Tab Bar: Horizontally Scrollable Full Width */}
            <nav className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none w-full">
              {[
                { key: 'ORDERS', label: 'Pesanan Masuk' },
                { key: 'RECAP', label: 'Rekap Dapur & Kurir' },
                { key: 'SCHEDULE', label: 'Jadwal & Operasional' },
                { key: 'FINANCE', label: 'Rekap Keuangan' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as ActiveTab)}
                  className={`h-7 px-3 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                    activeTab === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'ORDERS' && activeProcessingCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#0F2547] text-[#D4A843] ring-1 ring-[#D4A843] text-[9px] font-black">
                      {activeProcessingCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Desktop Header Layout (hidden sm:flex) */}
          <div className="hidden sm:flex items-center justify-between gap-4">
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
              <nav className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5 overflow-x-auto scrollbar-none">
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* TAB 1: PESANAN MASUK (DENGAN FILTER KAMPUS LOGISTIK & TOMBOL WA) */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            {/* Quick Campus Filter Pills for Logistics */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1 sm:pb-0">
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wider shrink-0 mr-0.5">
                  Logistik:
                </span>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
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
                    Halimun ({countHalimun})
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
                    Minangkabau ({countMinangkabau})
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <CustomSelect
                  value={filter.date}
                  onChange={handleDateChange}
                  options={DATE_OPTIONS}
                  icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
                />
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
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenManualModal}
                  className="h-9 px-3 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
                  title="Catat Pesanan Manual / Penjualan Langsung di Tempat (OTS) / Hari Lampau"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D4A843]" />
                  <span>Pesanan Manual (OTS)</span>
                </button>
                {hasFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilter({ campus: 'ALL', status: 'ALL', date: 'ALL' });
                      setSelectedRecapDate('ALL');
                    }}
                    className="h-9 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Widget Rekap Target Porsi Masak Tim Dapur Berdasarkan Tanggal & Filter */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-[#D4A843]/30 flex items-center justify-center shrink-0">
                    <ChefHat className="w-4 h-4 text-[#D4A843]" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-sm text-[#0F2547]">
                        Target Porsi Masak Tim Dapur
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {filter.date === 'ALL' ? 'Semua Jadwal' : filter.date}
                      </span>
                      {filter.campus !== 'ALL' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {CAMPUS_LABELS[filter.campus] || filter.campus}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Rincian total porsi yang harus dimasak berdasarkan filter jadwal dan kampus
                    </p>
                  </div>
                </div>

                {/* Quick Date Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">
                    Pilih Jadwal:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDateChange('ALL')}
                    className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      filter.date === 'ALL'
                        ? 'bg-[#0F2547] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  {orderDates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDateChange(d)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        filter.date === d
                          ? 'bg-[#0F2547] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Kartu Menu & Jumlah Porsi */}
              {Object.keys(kitchenPortionCounts).length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  Tidak ada pesanan aktif yang perlu dimasak untuk jadwal ini.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {Object.entries(kitchenPortionCounts).map(([name, count]) => (
                    <div
                      key={name}
                      className="bg-gradient-to-br from-slate-50 to-amber-50/40 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 flex flex-col justify-between shadow-xs"
                    >
                      <span className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 min-h-[30px]" title={name}>
                        {name}
                      </span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-[#0F2547]">{count}</span>
                        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                          Porsi / Btl
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Kartu Ringkasan Total Porsi Keseluruhan */}
                  <div className="bg-[#0F2547] text-white p-3 sm:p-3.5 rounded-xl border border-[#0F2547] flex flex-col justify-between shadow-xs">
                    <span className="text-xs font-bold text-amber-300 leading-snug">
                      Total Keseluruhan
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white">{totalKitchenPortions}</span>
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        {kitchenTargetOrders.length} Pesanan
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Petunjuk Geser di Tampilan Handphone */}
              <div className="sm:hidden flex items-center justify-between px-3.5 py-2 bg-slate-50/90 border-b border-slate-200 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span>Geser tabel ke samping untuk melihat menu &amp; aksi</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-bold">Scroll ➔</span>
              </div>

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
                <div className="w-full overflow-x-auto relative">
                  <table className="w-full text-left min-w-[720px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/95 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="sticky left-0 z-20 bg-slate-100/95 backdrop-blur-xs px-3.5 py-3 min-w-[130px] max-w-[145px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] border-r border-slate-200">
                          Antrean &amp; Pemesan
                        </th>
                        <th className="px-3.5 py-3 min-w-[170px]">Pengantaran &amp; Titik Temu</th>
                        <th className="px-3.5 py-3 min-w-[170px]">Menu Pesanan</th>
                        <th className="px-3.5 py-3 min-w-[110px]">Total &amp; Bayar</th>
                        <th className="px-3.5 py-3 min-w-[140px]">Status &amp; Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredOrders.map((order) => {
                        const phone = formatTo62Phone(order.customer_whatsapp);
                        const campusShort =
                          CAMPUS_LABELS[order.campus_location] || order.campus_location;

                        // Parse scheduled_time (contoh: "Selasa, 17 Nov 2026 pukul 10:00 WIB")
                        const [schedDate, schedTime] = (order.scheduled_time || '').split(' pukul ');
                        const displayDate = schedDate || order.scheduled_time || '-';
                        const displayTime = schedTime || '';

                        // Pre-filled WhatsApp notification message
                        const waMessage = `Halo kak ${order.customer_name}! Pesanan Kedai BGN kamu (${order.order_code}) sudah hampir sampai nih di titik temu ${campusShort} (${order.location_notes || '-'}). Siap-siap untuk ambil yaa! Terima kasih.`;
                        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
                          waMessage
                        )}`;

                        const next = nextStatusMap[order.order_status];
                        const isUpdating = isUpdatingStatus === order.id;
                        const pMethod = order.payment_method || order.payments?.[0]?.payment_method || 'CASH';
                        const isCashOrder = pMethod === 'CASH';
                        const isWaitingOrPending =
                          order.order_status === 'WAITING_PAYMENT' ||
                          (order.order_status as string) === 'PENDING';
                        const proofUrl =
                          order.delivery_proof_url ||
                          (order.payments?.[0]?.deeplink_url?.startsWith('http') || order.payments?.[0]?.deeplink_url?.startsWith('data:')
                            ? order.payments[0].deeplink_url
                            : null);

                        return (
                          <tr
                            key={order.id}
                            className="group hover:bg-slate-50/80 transition-colors align-top"
                          >
                            {/* Kolom 1: Antrean & Pemesan (Sticky di Sisi Kiri pada Mobile) */}
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-3.5 py-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] border-r border-slate-200">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-sm font-black text-[#0F2547]">
                                  {order.queue_number || '-'}
                                </span>
                                <span className="font-mono text-[9px] text-slate-400">
                                  {order.order_code.replace(/^BGN-/, '')}
                                </span>
                                {(order.order_code.includes('OTS') || order.queue_number?.startsWith('OTS')) && (
                                  <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    OTS
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-xs text-slate-900 mt-0.5 leading-snug line-clamp-2" title={order.customer_name}>
                                {order.customer_name}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[80px]">
                                  {order.customer_whatsapp}
                                </span>
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 inline-flex items-center justify-center shrink-0"
                                  title="Chat WhatsApp Pelanggan"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </td>

                            {/* Kolom 2: Pengantaran & Titik Temu */}
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F2547]">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{displayDate}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 font-medium">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="font-semibold text-slate-700">{campusShort}</span>
                                </span>
                                {displayTime && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{displayTime}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 font-medium mt-1 leading-snug">
                                <span className="text-slate-400">Titik: </span>
                                <span className="text-slate-800 font-medium">{order.location_notes || '-'}</span>
                              </div>
                              {order.order_notes && (
                                <div className="mt-1 text-[10px] text-slate-600 bg-slate-50 rounded px-1.5 py-0.5 border border-slate-200 leading-tight">
                                  <strong>Catatan:</strong> {order.order_notes}
                                </div>
                              )}
                            </td>

                            {/* Kolom 3: Menu Pesanan */}
                            <td className="px-3.5 py-3">
                              <div className="space-y-1">
                                {order.items && order.items.length > 0 ? (
                                  order.items.map((it, idx) => (
                                    <div key={it.id || it.product_id || idx} className="text-xs text-slate-800 leading-snug">
                                      <span className="font-bold text-[#0F2547]">{it.quantity}x</span>{' '}
                                      <span>{it.product_name || (it as unknown as { name?: string }).name || 'Menu'}</span>
                                      {it.selected_options && Object.keys(it.selected_options).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                          {Object.entries(it.selected_options).map(([k, v]) => (
                                            <span
                                              key={k}
                                              className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                                            >
                                              {v}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Menu tidak tercatat</span>
                                )}
                              </div>
                            </td>

                            {/* Kolom 4: Total & Bayar */}
                            <td className="px-3.5 py-3">
                              <div className="text-xs font-black text-slate-900">
                                {formatIDR(order.gross_amount)}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {pMethod}
                                </span>
                                {proofUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingProofUrl(proofUrl)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                                    title="Lihat Foto Bukti Serah Terima Makanan"
                                  >
                                    <Camera className="w-3 h-3 text-emerald-600" />
                                    <span>Bukti Foto</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenProofModal(order)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    title="Upload Foto Bukti Serah Terima Makanan / Screenshot QRIS"
                                  >
                                    <Upload className="w-3 h-3 text-slate-400" />
                                    <span>+ Bukti</span>
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Kolom 5: Status & Aksi */}
                            <td className="px-3.5 py-3">
                              <div className="flex items-start gap-1.5">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <span className={statusPill(order.order_status)}>
                                    {statusLabel(order.order_status, pMethod)}
                                  </span>

                                  {/* Pesanan Menunggu Bayar (CASH & QRIS): Konfirmasi & Upload Bukti Foto */}
                                  {isWaitingOrPending ? (
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenProofModal(order)}
                                        className="h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow-xs active:scale-95"
                                        title={isCashOrder ? 'Konfirmasi Lunas & Upload Foto Serah Terima' : 'Verifikasi Pembayaran & Upload Screenshot QRIS'}
                                      >
                                        <Camera className="w-3 h-3 text-white" />
                                        <span>{isCashOrder ? 'Konfirmasi Lunas' : 'Verifikasi QRIS'}</span>
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
                {/* Date Filter Custom Dropdown */}
                <CustomSelect
                  value={selectedRecapDate}
                  onChange={handleDateChange}
                  options={recapDateOptions}
                  icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
                  align="right"
                />

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
                      const isCash = (o.payment_method || o.payments?.[0]?.payment_method || 'CASH') === 'CASH';
                      const itemsStr = (o.items || [])
                        .map((it) => {
                          const optStr =
                            it.selected_options && Object.keys(it.selected_options).length > 0
                              ? ` (${Object.values(it.selected_options).join(', ')})`
                              : '';
                          return `${it.quantity}x ${it.product_name}${optStr}`;
                        })
                        .join(', ');
                      return (
                        <div key={o.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-xs text-[#0F2547]">
                              #{idx + 1} [{o.queue_number || o.order_code}]
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#D4A843]" />
                              {o.scheduled_time}
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
                      const isCash = (o.payment_method || o.payments?.[0]?.payment_method || 'CASH') === 'CASH';
                      const itemsStr = (o.items || [])
                        .map((it) => {
                          const optStr =
                            it.selected_options && Object.keys(it.selected_options).length > 0
                              ? ` (${Object.values(it.selected_options).join(', ')})`
                              : '';
                          return `${it.quantity}x ${it.product_name}${optStr}`;
                        })
                        .join(', ');
                      return (
                        <div key={o.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-xs text-[#0F2547]">
                              #{idx + 1} [{o.queue_number || o.order_code}]
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#D4A843]" />
                              {o.scheduled_time}
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
                      Senin, Jumat, Sabtu, dan Minggu sudah otomatis libur operasional (Kedai buka Selasa s/d Kamis). Tambahkan libur kampus atau tanggal merah di sini.
                    </p>
                  </div>
                </div>

                {holidayWarning && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 animate-in fade-in">
                    {holidayWarning}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <CustomDatePicker
                    value={newHolidayInput}
                    onChange={setNewHolidayInput}
                    placeholder="Pilih tanggal libur dari kalender..."
                    existingHolidays={settings.holidays}
                    disabled={isSavingSettings}
                  />
                  <button
                    type="button"
                    onClick={handleAddHoliday}
                    disabled={!newHolidayInput || isSavingSettings}
                    className="h-9 px-3.5 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0"
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
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span className="font-bold text-slate-800">{formatHolidayLabel(h)}</span>
                          <span className="font-mono text-[11px] text-slate-400">({h})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveHoliday(h)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
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
                    onClick={handleOpenManualModal}
                    className="h-8 px-3 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
                    title="Input Pesanan Manual / Hari Lampau"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D4A843]" />
                    <span>Input Manual (OTS)</span>
                  </button>
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
                <div className="w-full overflow-x-auto relative">
                  {/* Petunjuk Geser di Tampilan Handphone */}
                  <div className="sm:hidden flex items-center justify-between px-3.5 py-2 bg-slate-50/90 border-b border-slate-200 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span>Geser tabel ke samping untuk melihat rincian keuangan</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">Scroll ➔</span>
                  </div>

                  <table className="w-full text-left min-w-[740px] text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/95 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="sticky left-0 z-20 bg-slate-100/95 backdrop-blur-xs px-3 py-3 min-w-[120px] max-w-[130px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] border-r border-slate-200">
                          ID &amp; Waktu
                        </th>
                        <th className="px-3 py-3 min-w-[150px]">Pembeli &amp; Kampus</th>
                        <th className="px-3 py-3 min-w-[180px]">Menu Pesanan</th>
                        <th className="px-3 py-3 min-w-[120px]">Metode &amp; Bukti</th>
                        <th className="px-3 py-3 text-right min-w-[100px]">Gross (Rp)</th>
                        <th className="px-3 py-3 text-right min-w-[90px]">MDR (Rp)</th>
                        <th className="px-3 py-3 text-right min-w-[110px]">Net / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedFinanceOrders.map((o) => {
                        const isPaid = [...PROCESSING_STATUSES, ...DONE_STATUSES].includes(o.order_status);
                        const pMethod = o.payment_method || o.payments?.[0]?.payment_method || 'CASH';
                        const isCash = pMethod === 'CASH';
                        const mdrFee = isPaid
                          ? isCash
                            ? 0
                            : o.payments?.[0]?.mdr_fee_amount ??
                              Math.round((o.gross_amount || 0) * 0.007)
                          : 0;
                        const netRev = isPaid ? (o.gross_amount || 0) - mdrFee : 0;
                        const itemsStr = (o.items || [])
                          .map((it) => {
                            const optStr =
                              it.selected_options && Object.keys(it.selected_options).length > 0
                                ? ` (${Object.values(it.selected_options).join(', ')})`
                                : '';
                            return `${it.quantity}x ${it.product_name}${optStr}`;
                          })
                          .join(', ');
                        const proof =
                          o.delivery_proof_url ||
                          (o.payments?.[0]?.deeplink_url?.startsWith('http') || o.payments?.[0]?.deeplink_url?.startsWith('data:')
                            ? o.payments[0].deeplink_url
                            : null);

                        return (
                          <tr key={o.id} className="group hover:bg-slate-50/60 transition-colors">
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] border-r border-slate-200 align-top">
                              <div className="font-mono font-bold text-[#0F2547]">
                                {o.order_code}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {formatWIB(o.created_at)}
                              </div>
                              {o.scheduled_time && (
                                <div className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 mt-1">
                                  <Calendar className="w-2.5 h-2.5 text-[#D4A843]" />
                                  <span className="truncate">{o.scheduled_time}</span>
                                </div>
                              )}
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
                              <div className="space-y-1">
                                <span
                                  className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                    isCash
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-blue-100 text-blue-800 border-blue-300'
                                  }`}
                                >
                                  {pMethod}
                                </span>
                                {proof ? (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => setViewingProofUrl(proof)}
                                      className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 cursor-pointer"
                                      title="Lihat foto bukti"
                                    >
                                      <Camera className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>Bukti Foto</span>
                                    </button>
                                  </div>
                                ) : isCash ? (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenProofModal(o)}
                                      className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer"
                                      title="Upload foto bukti serah terima cash"
                                    >
                                      <Upload className="w-2.5 h-2.5 text-amber-600" />
                                      <span>+ Upload Bukti</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-slate-400">QRIS Midtrans</div>
                                )}
                              </div>
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
                <label className="text-xs font-bold text-slate-700 block">
                  Password Admin
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password admin"
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
                    {orderForProof.payment_method === 'CASH'
                      ? 'Konfirmasi Serah Terima & Pelunasan COD'
                      : 'Verifikasi Pembayaran & Bukti Transfer QRIS'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {orderForProof.payment_method === 'CASH'
                      ? 'Wajib foto bukti pembeli menerima makanan dan menyerahkan uang tunai'
                      : 'Unggah screenshot bukti transfer QRIS yang dikirimkan pemesan via WhatsApp'}
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
                  <span className="font-bold text-slate-700">
                    {orderForProof.payment_method === 'CASH' ? 'Total Uang Tunai Diterima:' : 'Total Tagihan QRIS:'}
                  </span>
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
                        {orderForProof.payment_method === 'CASH'
                          ? 'Klik untuk Ambil Foto dari Kamera atau Pilih File'
                          : 'Klik untuk Unggah Screenshot Bukti QRIS'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {orderForProof.payment_method === 'CASH'
                          ? 'Foto makanan yang diterima pembeli sebagai bukti fisik serah terima'
                          : 'Tangkapan layar bukti pembayaran yang dikirimkan pemesan melalui WhatsApp'}
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

        {/* Modal Input Pesanan Manual / OTS (Hari Lampau atau Hari Ini) */}
        {manualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-4 sm:p-6 space-y-4 my-8">
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0F2547] text-[#D4A843] flex items-center justify-center shrink-0 shadow-xs">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Input Pesanan Manual (OTS)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Catat penjualan langsung di tempat atau transaksi hari lampau
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  disabled={isSubmittingManual}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSubmitManualOrder} className="space-y-3.5">
                {/* Baris 1: Tanggal Transaksi & Jam */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Tanggal Transaksi:
                    </label>
                    <input
                      type="date"
                      required
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0F2547] focus:ring-2 focus:ring-[#D4A843]/20"
                    />
                    <p className="text-[10px] text-slate-400">Bisa pilih tanggal kemarin atau hari ini</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Jam Transaksi:
                    </label>
                    <input
                      type="text"
                      required
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      placeholder="Contoh: 12:00 WIB"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0F2547] focus:ring-2 focus:ring-[#D4A843]/20"
                    />
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {['10:00 WIB', '11:30 WIB', '12:00 WIB', '13:30 WIB'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setManualTime(t)}
                          className="text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Baris 2: Lokasi Kampus & Titik Temu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Lokasi Kampus:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Kampus B Halimun', 'Kampus C Minangkabau'] as CampusLocation[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setManualCampus(c)}
                          className={`h-9 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            manualCampus === c
                              ? 'bg-[#0F2547] text-white border-[#0F2547] shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {CAMPUS_LABELS[c] || c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Titik Temu / Keterangan:
                    </label>
                    <input
                      type="text"
                      value={manualLocationNotes}
                      onChange={(e) => setManualLocationNotes(e.target.value)}
                      placeholder="Contoh: Beli langsung di gazebo"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0F2547]"
                    />
                  </div>
                </div>

                {/* Baris 3: Data Pembeli (Opsional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Nama Pembeli (Opsional):
                    </label>
                    <input
                      type="text"
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                      placeholder="Contoh: Pak Dosen / OTS"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0F2547]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      No WhatsApp (Opsional):
                    </label>
                    <input
                      type="text"
                      value={manualCustomerPhone}
                      onChange={(e) => setManualCustomerPhone(e.target.value)}
                      placeholder="Boleh dikosongkan"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0F2547]"
                    />
                  </div>
                </div>

                {/* Baris 4: Pilihan Menu & Jumlah Porsi */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Pilih Menu &amp; Jumlah Porsi:</span>
                    <span className="text-[11px] text-amber-700 font-black">
                      Subtotal: {formatIDR(manualTotalAmount)}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {products.map((p) => {
                      const qty = manualItemQuantities[p.id] || 0;
                      return (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-500">{formatIDR(p.price)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateManualItemQty(p.id, -1)}
                                disabled={qty <= 0}
                                className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center font-bold text-xs text-slate-900">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateManualItemQty(p.id, 1)}
                                className="w-7 h-7 rounded-lg bg-[#0F2547] hover:bg-[#163566] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {qty > 0 && p.variants && p.variants.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                              {p.variants.map((vGroup) => {
                                const currentOpt =
                                  manualItemOptions[p.id]?.[vGroup.group_name] ||
                                  vGroup.options[0] ||
                                  '';
                                return (
                                  <div key={vGroup.id} className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                      <span>{vGroup.group_name}:</span>
                                      <span className="text-[10px] text-amber-700 font-semibold">
                                        (Wajib)
                                      </span>
                                    </div>
                                    <select
                                      value={currentOpt}
                                      onChange={(e) =>
                                        setManualItemOptions((prev) => ({
                                          ...prev,
                                          [p.id]: {
                                            ...(prev[p.id] || {}),
                                            [vGroup.group_name]: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-[#0F2547]"
                                    >
                                      {vGroup.options.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Baris 5: Metode Pembayaran */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">
                    Metode Pembayaran:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualPaymentMethod('CASH')}
                      className={`h-9 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        manualPaymentMethod === 'CASH'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Tunai (CASH)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualPaymentMethod('QRIS')}
                      className={`h-9 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        manualPaymentMethod === 'QRIS'
                          ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>QRIS Statis</span>
                    </button>
                  </div>
                </div>

                {/* Status Notice */}
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 space-y-0.5">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Status Otomatis: Selesai &amp; Lunas (COMPLETED)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[10px]">
                    Pesanan ini langsung tercatat lunas di Rekap Keuangan dan tidak mengganggu antrean dapur hari ini.
                  </p>
                </div>

                {manualError && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <span>•</span>
                    <span>{manualError}</span>
                  </p>
                )}

                {manualSuccessMsg && (
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{manualSuccessMsg}</span>
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setManualModalOpen(false)}
                    disabled={isSubmittingManual}
                    className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingManual || manualTotalAmount <= 0}
                    className="h-9 px-4 rounded-xl bg-[#0F2547] hover:bg-[#163566] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    {isSubmittingManual ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#D4A843]" />
                        <span>Simpan Transaksi ({formatIDR(manualTotalAmount)})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
