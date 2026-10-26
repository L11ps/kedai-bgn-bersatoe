'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Clock,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Lock,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatIDR } from '@/lib/formatters';
import { CampusLocation, OrderType } from '@/types';

const CAMPUS_OPTIONS: CampusLocation[] = [
  'Kampus B Halimun',
  'Kampus C Minangkabau',
  'Kampus SB Daan Mogot',
];

// Custom Campus dropdown replacing native select
function CustomCampusSelect({
  value,
  onChange,
}: {
  value: CampusLocation;
  onChange: (c: CampusLocation) => void;
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left font-bold text-slate-900 flex items-center justify-between gap-1 py-0.5 focus:outline-none"
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-300/50 py-1 overflow-hidden min-w-[200px]">
          {CAMPUS_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                c === value
                  ? 'bg-[#0F2547]/10 text-[#0F2547] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{c}</span>
              {c === value && <Check className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Custom Time Slot dropdown replacing native select
function CustomTimeSlotSelect({
  value,
  onChange,
  disabledSlotsCheck,
}: {
  value: string;
  onChange: (v: string) => void;
  disabledSlotsCheck: (slot: string) => boolean;
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

  const isCurrentValueDisabled = disabledSlotsCheck(value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="time-slot"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F2547] focus:ring-2 focus:ring-[#D4A843]/20 flex items-center justify-between gap-2 transition-all shadow-xs"
      >
        <div className="flex items-center gap-2 truncate">
          <Clock className="w-4 h-4 text-[#0F2547] shrink-0" />
          <span className="truncate">{value}</span>
          {isCurrentValueDisabled && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
              Sudah lewat
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/60 max-h-60 overflow-y-auto p-1.5 space-y-1">
          {TIME_SLOTS.map((slot) => {
            const disabled = disabledSlotsCheck(slot);
            const isSelected = slot === value;

            return (
              <button
                key={slot}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    onChange(slot);
                    setOpen(false);
                  }
                }}
                className={`w-full text-left min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                    : isSelected
                    ? 'bg-[#0F2547]/10 text-[#0F2547] font-bold border border-[#D4A843]/40'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0F2547]' : 'text-slate-400'}`} />
                  <span>{slot}</span>
                </div>
                {disabled ? (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    Sudah lewat
                  </span>
                ) : isSelected ? (
                  <Check className="w-4 h-4 text-[#D4A843] shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Generate 30-min time slots from 07:00 to 17:00 WIB
const TIME_SLOTS: string[] = [
  '07:00 WIB',
  '07:30 WIB',
  '08:00 WIB',
  '08:30 WIB',
  '09:00 WIB',
  '09:30 WIB',
  '10:00 WIB',
  '10:30 WIB',
  '11:00 WIB',
  '11:30 WIB',
  '12:00 WIB',
  '12:30 WIB',
  '13:00 WIB',
  '13:30 WIB',
  '14:00 WIB',
  '14:30 WIB',
  '15:00 WIB',
  '15:30 WIB',
  '16:00 WIB',
  '16:30 WIB',
  '17:00 WIB',
];

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    subtotal,
    clearCart,
    orderType,
    setOrderType,
    selectedCampus,
    setSelectedCampus,
  } = useCart();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('12:00 WIB');
  const [simulationMode, setSimulationMode] = useState<boolean>(false);

  // Loading & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Current client time for Ready validation
  const [currentMinutesFromMidnight, setCurrentMinutesFromMidnight] = useState<number>(12 * 60);

  useEffect(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    setCurrentMinutesFromMidnight(mins);
  }, []);

  // Format tomorrow date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  // Slot validity check for Ready Hari Ini: must be between 07:00 - 17:00 and at least +30 min from now
  const isSlotDisabled = (slot: string) => {
    if (orderType === 'PO' || simulationMode) return false;

    const [hourStr, minPart] = slot.replace(' WIB', '').split(':');
    const slotMins = parseInt(hourStr, 10) * 60 + parseInt(minPart, 10);

    // Operational window: 07:00 (420 min) to 17:00 (1020 min)
    if (slotMins < 420 || slotMins > 1020) return true;

    // Must be at least +30 min from now
    if (slotMins < currentMinutesFromMidnight + 30) return true;

    return false;
  };

  const isTodayOperationalClosed =
    orderType === 'READY' &&
    !simulationMode &&
    (currentMinutesFromMidnight < 420 || currentMinutesFromMidnight > 1000);

  // Form validations
  const phoneClean = customerWhatsapp.replace(/\s+/g, '');
  const isPhoneValid = /^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(phoneClean);
  const isNameValid = customerName.trim().length >= 3;
  const isLocationValid = locationNotes.trim().length >= 3;
  const canSubmit = isNameValid && isPhoneValid && isLocationValid && items.length > 0;

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_whatsapp: phoneClean,
        order_type: orderType,
        campus_location: selectedCampus,
        location_notes: locationNotes.trim(),
        scheduled_time: selectedTimeSlot,
        payment_method: 'QRIS' as const,
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          selected_options: it.selected_options,
          special_notes: it.special_notes,
        })),
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memproses pesanan.');
      }

      clearCart();
      router.push(`/order/${data.order_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-[440px] w-full bg-white rounded-2xl p-6 text-center space-y-3 shadow-xs border border-slate-200">
          <h2 className="font-extrabold text-sm text-slate-900">Keranjang Belanja Kosong</h2>
          <p className="text-xs text-slate-500">
            Anda belum memilih menu apa pun untuk checkout.
          </p>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center px-4 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 font-bold text-xs"
          >
            Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071324] sm:py-6 flex flex-col items-center justify-start antialiased text-slate-900 selection:bg-[#D4A843] selection:text-[#0F2547]">
      <div className="w-full max-w-[480px] min-h-screen sm:min-h-[92vh] sm:rounded-3xl overflow-hidden bg-white flex flex-col shadow-2xl relative border-x border-slate-200/80 pb-28">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0F2547]/95 backdrop-blur-md border-b border-[#9EC6E3]/25 px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-extrabold text-sm text-[#FAF8F5]">Checkout Pesanan</h1>
            <p className="text-[11px] text-[#9EC6E3]">KEDAI BGN BERSATOE • EST. 1998</p>
          </div>
        </header>

        <form onSubmit={handleSubmitCheckout} className="p-4 space-y-4 flex-1">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Order Type & Campus Summary */}
          <section className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              1. Tipe Pesanan &amp; Lokasi Kampus
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-400 block font-medium">Tipe Pesanan</span>
                <span className="font-bold text-slate-900">
                  {orderType === 'READY' ? 'Ready Hari Ini' : `Pre-Order Besok (${tomorrowFormatted})`}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-400 block font-medium mb-0.5">Ganti Lokasi</span>
                <CustomCampusSelect
                  value={selectedCampus}
                  onChange={(c) => setSelectedCampus(c)}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Customer Identity */}
          <section className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              2. Data Pemesan
            </span>

            <div className="space-y-1">
              <label htmlFor="customer-name" className="text-xs font-semibold text-slate-700 block">
                Nama Pemesan <span className="text-red-500">*</span>
              </label>
              <input
                id="customer-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full h-10 text-xs px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#0F2547] focus:ring-1 focus:ring-[#D4A843]/40"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="customer-wa" className="text-xs font-semibold text-slate-700 block">
                Nomor WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                id="customer-wa"
                type="tel"
                required
                value={customerWhatsapp}
                onChange={(e) => setCustomerWhatsapp(e.target.value)}
                placeholder="Contoh: 08123456789 atau 628123456789"
                className="w-full h-10 text-xs px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#0F2547] focus:ring-1 focus:ring-[#D4A843]/40"
              />
              <p className="text-[10px] text-slate-400">
                Pemberitahuan nomor antrean dan status antar dikirim via WhatsApp.
              </p>
            </div>
          </section>

          {/* Section 3: Campus Meet Point */}
          <section className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              3. Titik Temu di Kampus
            </span>

            <label htmlFor="location-notes" className="text-xs font-semibold text-slate-700 block">
              Detail Titik Temu / Ruangan di {selectedCampus} <span className="text-red-500">*</span>
            </label>
            <input
              id="location-notes"
              type="text"
              required
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="Contoh: Gedung B Lantai 2 Ruang 204, atau Lobi Utama dekat satpam"
              className="w-full h-10 text-xs px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#0F2547] focus:ring-1 focus:ring-[#D4A843]/40"
            />
          </section>

          {/* Section 4: Flexible Delivery Time (07:00 - 17:00 WIB) */}
          <section className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                4. Jam Pengambilan / Pengantaran
              </span>
              <span className="text-[10px] text-slate-400">07:00 s.d. 17:00 WIB</span>
            </div>

            {isTodayOperationalClosed && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Jam operasional hari ini telah tutup.</p>
                <p className="text-[11px]">
                  Pengantaran Ready hari ini berlangsung pukul 07:00 s.d. 17:00 WIB. Silakan ubah ke Pre-Order Besok.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="time-slot" className="text-xs font-semibold text-slate-700 block">
                Pilih Jam Waktu Tiba
              </label>
              <CustomTimeSlotSelect
                value={selectedTimeSlot}
                onChange={(v) => setSelectedTimeSlot(v)}
                disabledSlotsCheck={isSlotDisabled}
              />
            </div>

            {/* Simulation Mode Toggle for Testing */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Uji coba di luar jam operasional?</span>
              <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={simulationMode}
                  onChange={(e) => setSimulationMode(e.target.checked)}
                  className="rounded text-[#0F2547] focus:ring-0"
                />
                <span>Mode Simulasi Testing</span>
              </label>
            </div>
          </section>

          {/* Section 5: Payment Method (ONLY QRIS) */}
          <section className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              5. Metode Pembayaran
            </span>

            <div className="p-3 rounded-xl border-2 border-[#0F2547] bg-[#0F2547]/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0F2547] text-[#D4A843] flex items-center justify-center shrink-0 shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-[#0F2547] block">
                    QRIS (Semua M-Banking &amp; E-Wallet)
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    BCA Mobile, Mandiri, BRI, GoPay, OVO, ShopeePay, DANA
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#0F2547] bg-[#D4A843]/25 px-2 py-0.5 rounded-md border border-[#D4A843]/40">
                Otomatis
              </span>
            </div>
          </section>

          {/* Section 6: Summary of Items */}
          <section className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              6. Rincian Tagihan
            </span>

            <div className="space-y-1.5 divide-y divide-slate-200">
              {items.map((it) => (
                <div key={it.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {Object.values(it.selected_options).join(', ')}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {formatIDR(it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="font-bold text-slate-700">Total Pembayaran</span>
              <span className="font-black text-[#0F2547]">{formatIDR(subtotal)}</span>
            </div>
          </section>

          {/* Sticky Bottom Submit Button */}
          <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 max-w-[480px] mx-auto z-40">
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                canSubmit && !isSubmitting
                  ? 'bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/60 shadow-md active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span>Memproses Pesanan...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#D4A843]" />
                  <span>Bayar Sekarang ({formatIDR(subtotal)})</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-1.5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Pembayaran QRIS Aman &amp; Terverifikasi Otomatis</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
