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
  Banknote,
  CalendarCheck,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatIDR } from '@/lib/formatters';
import { CampusLocation, PaymentMethod } from '@/types';

const CAMPUS_OPTIONS: CampusLocation[] = [
  'Kampus B Halimun',
  'Kampus C Minangkabau',
];

interface DateOption {
  dateString: string;
  displayLabel: string;
  dayName: string;
}

// Generate fallback Monday-Friday dates starting tomorrow
function getFallbackDates(): DateOption[] {
  const list: DateOption[] = [];
  const cur = new Date();
  cur.setDate(cur.getDate() + 1); // Min H-1

  while (list.length < 5) {
    const day = cur.getDay();
    if (day >= 1 && day <= 5) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      list.push({
        dateString: `${year}-${month}-${d}`,
        displayLabel: cur.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        }),
        dayName: cur.toLocaleDateString('id-ID', { weekday: 'long' }),
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return list;
}

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    subtotal,
    clearCart,
    selectedCampus,
    setSelectedCampus,
  } = useCart();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Operational Date & Time Slots
  const [availableDates, setAvailableDates] = useState<DateOption[]>(getFallbackDates);
  const [selectedDate, setSelectedDate] = useState<DateOption>(getFallbackDates()[0]);
  const [timeSlots, setTimeSlots] = useState<string[]>([
    '10:00 WIB',
    '11:00 WIB',
    '12:00 WIB',
    '12:30 WIB',
    '13:00 WIB',
    '14:00 WIB',
    '15:00 WIB',
  ]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('12:00 WIB');

  // Loading & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch admin operational settings (holidays & active slots)
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.availableDates && data.availableDates.length > 0) {
            setAvailableDates(data.availableDates);
            setSelectedDate(data.availableDates[0]);
          }
          if (data.settings?.activeTimeSlots && data.settings.activeTimeSlots.length > 0) {
            setTimeSlots(data.settings.activeTimeSlots);
            setSelectedTimeSlot(data.settings.activeTimeSlots[0]);
          }
        }
      })
      .catch((err) => console.warn('Using default settings:', err));
  }, []);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Form Validations
    if (!customerName || customerName.trim().length < 3) {
      setErrorMessage('Nama pemesan wajib diisi minimal 3 karakter.');
      return;
    }

    const cleanPhone = customerWhatsapp.replace(/\s+/g, '');
    const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMessage('Nomor WhatsApp tidak valid. Masukkan nomor WhatsApp aktif (contoh: 081234567890).');
      return;
    }

    if (!locationNotes || locationNotes.trim().length < 3) {
      setErrorMessage('Detail titik temu di kampus wajib diisi (contoh: Depan Lift Lt 2 / Gazebo).');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Keranjang belanja Anda masih kosong.');
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduleString = `${selectedDate.displayLabel} pukul ${selectedTimeSlot}`;

      const payload = {
        customer_name: customerName.trim(),
        customer_whatsapp: cleanPhone,
        order_type: 'PO' as const,
        campus_location: selectedCampus,
        location_notes: locationNotes.trim(),
        order_notes: orderNotes.trim() || undefined,
        scheduled_time: scheduleString,
        payment_method: paymentMethod,
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          selected_options: {},
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

      // Cache order to localStorage for instant client-side resiliency across serverless instances
      if (typeof window !== 'undefined') {
        try {
          const cachedOrder = {
            ...(data.order || {}),
            id: data.order_id,
            order_code: data.order_code,
            queue_number: data.queue_number,
            gross_amount: data.gross_amount,
            customer_name: payload.customer_name,
            customer_whatsapp: payload.customer_whatsapp,
            campus_location: payload.campus_location,
            location_notes: payload.location_notes,
            order_notes: payload.order_notes,
            scheduled_time: payload.scheduled_time,
            order_status: 'WAITING_PAYMENT',
            items: payload.items.map((it: any) => ({
              product_id: it.product_id,
              quantity: it.quantity,
              product_name: items.find((ci) => ci.product_id === it.product_id)?.name || 'Menu',
              unit_price: items.find((ci) => ci.product_id === it.product_id)?.price || 0,
            })),
            payment: data.payment || {
              id: `pay-${data.order_id}`,
              order_id: data.order_id,
              payment_method: data.payment_method,
              payment_status: 'PENDING',
              gross_amount: data.gross_amount,
              deeplink_url: data.redirect_url,
              expiry_time: data.expiry_time,
              snap_token: data.snap_token,
            },
          };

          localStorage.setItem(`bgn_order_${data.order_id}`, JSON.stringify(cachedOrder));
          if (data.order_code) {
            localStorage.setItem(`bgn_order_${data.order_code}`, JSON.stringify(cachedOrder));
          }

          // Also save to recent orders list for dashboard or re-tracking
          const recents = JSON.parse(localStorage.getItem('bgn_recent_orders') || '[]');
          recents.unshift(cachedOrder);
          localStorage.setItem('bgn_recent_orders', JSON.stringify(recents.slice(0, 50)));
        } catch (storageErr) {
          console.warn('LocalStorage caching warning:', storageErr);
        }
      }

      clearCart();

      // Navigate to order tracking page
      router.push(`/order/${data.order_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#071324] sm:py-6 flex flex-col items-center justify-center p-4">
        <div className="max-w-[440px] w-full bg-white rounded-3xl p-6 text-center space-y-4 shadow-xl border border-slate-200">
          <AlertCircle className="w-12 h-12 text-[#D4A843] mx-auto" />
          <h2 className="font-extrabold text-base text-slate-900">Keranjang Belanja Kosong</h2>
          <p className="text-xs text-slate-500">
            Anda belum memilih menu apa pun untuk checkout.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center px-6 rounded-2xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] font-bold text-xs border border-[#D4A843]/50 transition-colors"
          >
            Pilih Menu Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071324] sm:py-6 flex flex-col items-center justify-start antialiased text-slate-900 selection:bg-[#D4A843] selection:text-[#0F2547]">
      <div className="w-full max-w-[480px] min-h-screen sm:min-h-[92vh] sm:rounded-3xl overflow-hidden bg-white flex flex-col shadow-2xl relative border-x border-slate-200/80 pb-20">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-extrabold text-sm text-[#0F2547]">Konfirmasi Pemesanan</h1>
            <p className="text-[11px] text-slate-500">Kedai BGN Bersatoe Tel-U</p>
          </div>
        </header>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="m-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="p-4 space-y-5 flex-1">
          {/* Section 1: Customer Details */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-[#D4A843]" />
              <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                1. Data Pemesan
              </h2>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="customer-name" className="text-xs font-semibold text-slate-700 block">
                Nama Lengkap / Panggilan
              </label>
              <input
                id="customer-name"
                type="text"
                required
                placeholder="Contoh: Raditya Dharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#0F2547] focus:ring-2 focus:ring-[#D4A843]/20 transition-all shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="customer-wa" className="text-xs font-semibold text-slate-700 block">
                Nomor WhatsApp Aktif
              </label>
              <input
                id="customer-wa"
                type="tel"
                required
                placeholder="Contoh: 081234567890"
                value={customerWhatsapp}
                onChange={(e) => setCustomerWhatsapp(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#0F2547] focus:ring-2 focus:ring-[#D4A843]/20 transition-all shadow-xs"
              />
              <p className="text-[10px] text-slate-400">
                Nomor ini digunakan untuk kirim nota &amp; notifikasi saat pesanan tiba.
              </p>
            </div>
          </div>

          {/* Section 2: Campus & Meeting Point */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-[#D4A843]" />
              <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                2. Lokasi Pengantaran Kampus
              </h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Pilih Kampus Tujuan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CAMPUS_OPTIONS.map((c) => {
                  const isSel = selectedCampus === c;
                  const label = c === 'Kampus B Halimun' ? 'Kampus Halimun' : 'Kampus Minangkabau';
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCampus(c)}
                      className={`min-h-[44px] p-2.5 rounded-xl text-left border flex items-center justify-between text-xs font-bold transition-all ${
                        isSel
                          ? 'bg-[#0F2547] text-white border-[#0F2547] shadow-sm ring-2 ring-[#D4A843]/40'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{label}</span>
                      <MapPin className={`w-3.5 h-3.5 ${isSel ? 'text-[#D4A843]' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="location-notes" className="text-xs font-semibold text-slate-700 block">
                Detail Titik Temu / Ruangan di Kampus
              </label>
              <input
                id="location-notes"
                type="text"
                required
                placeholder="Contoh: Depan Gazebo / Kantin Lt 2 / Kelas 302"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#0F2547] focus:ring-2 focus:ring-[#D4A843]/20 transition-all shadow-xs"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label htmlFor="order-notes" className="text-xs font-semibold text-slate-700 block">
                Catatan Khusus Pesanan (Opsional)
              </label>
              <textarea
                id="order-notes"
                rows={2}
                placeholder="Contoh: Bumbu dipisah, jangan terlalu pedas, sendok tambahan, dll."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#0F2547] focus:ring-2 focus:ring-[#D4A843]/20 transition-all shadow-xs resize-none"
              />
            </div>
          </div>

          {/* Section 3: Delivery Date & Time (Min H-1, Senin - Jumat) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-[#D4A843]" />
              <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                3. Jadwal Pengantaran (PO Min H-1)
              </h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Pilih Tanggal Pengantaran (Senin s/d Jumat):
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {availableDates.map((d) => {
                  const isSel = selectedDate.dateString === d.dateString;
                  return (
                    <button
                      key={d.dateString}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`p-2.5 rounded-xl text-left border flex items-center justify-between text-xs transition-all ${
                        isSel
                          ? 'bg-[#0F2547] text-white border-[#0F2547] font-bold shadow-xs ring-2 ring-[#D4A843]/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className={`text-[10px] block ${isSel ? 'text-[#D4A843]' : 'text-slate-400'}`}>
                          {d.dayName}
                        </span>
                        <span className="truncate block font-semibold">{d.displayLabel}</span>
                      </div>
                      {isSel && <Check className="w-3.5 h-3.5 text-[#D4A843] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Pilih Jam Waktu Tiba:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {timeSlots.map((slot) => {
                  const isSel = selectedTimeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`h-10 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                        isSel
                          ? 'bg-[#0F2547] text-white border-[#0F2547] font-bold shadow-xs ring-2 ring-[#D4A843]/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className={`w-3 h-3 ${isSel ? 'text-[#D4A843]' : 'text-slate-400'}`} />
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Payment Method (QRIS Midtrans vs CASH) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-[#D4A843]" />
              <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                4. Metode Pembayaran
              </h2>
            </div>

            <div className="space-y-2">
              {/* Payment Method Notice */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/60 text-[11px] text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Rekomendasi Pembayaran</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Pilih <strong>Tunai di Tempat (CASH)</strong> untuk pesanan langsung diproses tanpa kendala dan bayar uang pas saat kurir tiba di titik kumpul kampus.
                </p>
              </div>

              {/* Option 1: QRIS Midtrans (Dalam Maintenance - Tidak Bisa Di Klik) */}
              <div
                aria-disabled="true"
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-start gap-3 opacity-60 cursor-not-allowed select-none transition-all"
                title="Metode pembayaran QRIS sedang dalam maintenance"
              >
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 mt-0.5 flex items-center justify-center shrink-0 bg-slate-200" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs text-slate-500">
                      QRIS / E-Wallet (Midtrans)
                    </span>
                    <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                      Dalam Maintenance
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Layanan pembayaran QRIS sedang dalam proses pemeliharaan. Silakan gunakan metode pembayaran Tunai di Tempat (CASH).
                  </p>
                </div>
              </div>

              {/* Option 2: CASH (COD) */}
              <label
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-[#0F2547]/5 border-[#0F2547] ring-2 ring-[#D4A843]/40'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                  paymentMethod === 'CASH' ? 'border-[#0F2547] bg-[#0F2547]' : 'border-slate-300'
                }`}>
                  {paymentMethod === 'CASH' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">
                      Tunai di Tempat (CASH / COD)
                    </span>
                    <span className="text-[10px] font-bold text-[#0F2547] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Uang Pas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bayar langsung dengan uang pas saat pesanan diserahkan di titik temu kampus.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 5: Order Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
            <h3 className="font-bold text-xs text-slate-900">Ringkasan Pesanan</h3>
            <div className="space-y-1.5 divide-y divide-slate-200/60">
              {items.map((it) => (
                <div key={it.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                  <span className="text-slate-700">
                    {it.quantity}x {it.name}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatIDR(it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="font-black text-xs text-[#0F2547]">Total Tagihan</span>
              <span className="font-black text-sm text-[#0F2547]">
                {formatIDR(subtotal)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full min-h-[48px] rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
                isSubmitting
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/60 shadow-[#0F2547]/20'
              }`}
            >
              {isSubmitting ? (
                <span>Memproses Pesanan...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#D4A843]" />
                  <span>
                    {paymentMethod === 'CASH'
                      ? 'Konfirmasi Pesanan (Bayar Tunai)'
                      : `Bayar ${formatIDR(subtotal)} via Midtrans`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
