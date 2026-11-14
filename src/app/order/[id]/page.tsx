'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  ExternalLink,
  Store,
  RefreshCw,
  Home,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Banknote,
  MessageCircle,
} from 'lucide-react';
import { Order, Payment } from '@/types';
import { formatIDR } from '@/lib/formatters';

const STAGES = [
  {
    key: 'PAID',
    label: 'Pesanan Diterima',
    desc: 'Pesanan telah masuk antrean dapur & siap dimasak',
    icon: CheckCircle2,
  },
  {
    key: 'COMPLETED',
    label: 'Pesanan Selesai',
    desc: 'Pesanan telah diserahkan di titik temu kampus. Selamat menikmati!',
    icon: Store,
  },
];

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<Order | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`bgn_order_${orderId}`);
        if (cached) return JSON.parse(cached);
      } catch {
        /* silent */
      }
    }
    return null;
  });
  const [payment, setPayment] = useState<Payment | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`bgn_order_${orderId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.payment) return parsed.payment;
        }
      } catch {
        /* silent */
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch Order
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        if (data.order.payment) {
          setPayment(data.order.payment);
        } else if (data.order.payments?.[0]) {
          setPayment(data.order.payments[0]);
        }
      } else {
        // Fallback to local storage if serverless instance has not synchronized
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`bgn_order_${orderId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setOrder((prev) => prev || parsed);
              if (parsed.payment) {
                setPayment((prev) => prev || parsed.payment);
              }

              // Send rehydration ping to server
              fetch(`/api/orders/${orderId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: parsed, payment: parsed.payment }),
              }).catch(() => {});
            } catch {
              /* silent */
            }
          }
        }
      }
    } catch (err) {
      console.error('Fetch order error:', err);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`bgn_order_${orderId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setOrder((prev) => prev || parsed);
            if (parsed.payment) setPayment((prev) => prev || parsed.payment);
          } catch {
            /* silent */
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Realtime polling fallback every 3 seconds
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Trigger Confetti when status transitions to PAID or COMPLETED
  useEffect(() => {
    if (order && (order.order_status === 'PAID' || order.order_status === 'COMPLETED')) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0F2547', '#D4A843', '#9EC6E3', '#10B981'],
      });
    }
  }, [order?.order_status]);

  // Countdown timer for 15-minute expiry (only for WAITING_PAYMENT)
  useEffect(() => {
    if (!payment?.expiry_time || order?.order_status !== 'WAITING_PAYMENT') return;

    const expiryMs = new Date(payment.expiry_time).getTime();
    const timer = setInterval(() => {
      const remainingSec = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setTimeLeft(remainingSec);
      if (remainingSec <= 0) {
        clearInterval(timer);
        fetchOrder();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [payment?.expiry_time, order?.order_status]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSimulatePayment = async () => {
    if (!order) return;
    setIsSimulating(true);
    try {
      await fetch('/api/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          status: 'settlement',
          paymentMethod: payment?.payment_method || 'QRIS',
        }),
      });
      await fetchOrder();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyOrderCode = () => {
    if (order) {
      navigator.clipboard.writeText(order.order_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (isLoading && !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#D4A843] animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Memuat status pesanan...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-[480px] w-full bg-white rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="font-extrabold text-base text-slate-900">Pesanan Tidak Ditemukan</h2>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center px-6 rounded-2xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 font-bold text-xs transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const isWaitingPayment = order.order_status === 'WAITING_PAYMENT';
  const isExpired = order.order_status === 'EXPIRED';
  const isCompleted = order.order_status === 'COMPLETED';
  const isCash = order.payment_method === 'CASH';

  return (
    <div className="min-h-screen bg-[#071324] sm:py-6 flex flex-col items-center justify-start antialiased text-slate-900 selection:bg-[#D4A843] selection:text-[#0F2547]">
      <div className="w-full max-w-[480px] min-h-screen sm:min-h-[92vh] sm:rounded-3xl overflow-hidden bg-white flex flex-col shadow-2xl relative border-x border-slate-200/80 pb-20">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-[#0F2547]/95 backdrop-blur-md border-b border-[#9EC6E3]/25 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <Home className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-extrabold text-sm text-[#FAF8F5]">Status Pesanan</h1>
              <p className="text-[11px] text-[#D4A843] font-bold">{order.order_code}</p>
            </div>
          </div>

          <button
            onClick={fetchOrder}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            title="Muat Ulang Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 space-y-6 flex-1">
          {/* CASE A: WAITING_PAYMENT (QRIS / Midtrans Online) */}
          {isWaitingPayment && !isCash ? (
            <div className="space-y-5">
              {/* Expiry Countdown Box */}
              <div className="bg-amber-500 text-white rounded-3xl p-4 shadow-lg shadow-amber-500/20 text-center space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold opacity-90 block">
                  Batas Waktu Pembayaran
                </span>
                <div className="text-3xl font-black tracking-tight flex items-center justify-center gap-2">
                  <Clock className="w-7 h-7 text-amber-100" />
                  <span>{formatTimer(timeLeft)}</span>
                </div>
                <p className="text-[11px] text-amber-100">
                  Selesaikan pembayaran sebelum batas waktu habis.
                </p>
              </div>

              {/* Midtrans / QRIS Display Card */}
              <div className="bg-white rounded-3xl p-5 border-2 border-[#0F2547]/20 shadow-md text-center space-y-4">
                <div className="inline-block px-3 py-1 rounded-full bg-[#0F2547] text-[#D4A843] border border-[#D4A843]/40 font-bold text-xs">
                  Pembayaran Online Midtrans
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">Total Tagihan</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatIDR(order.gross_amount)}
                  </span>
                </div>

                {/* Embedded Midtrans Payment Frame (QR Langsung di Web) */}
                {payment?.deeplink_url ? (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-slate-600 font-semibold">
                      Silakan scan kode QRIS langsung di bawah ini:
                    </p>
                    <div className="relative w-full rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm bg-slate-50 flex items-center justify-center">
                      <iframe
                        src={payment.deeplink_url}
                        className="w-full border-0"
                        style={{ height: '580px', minHeight: '520px' }}
                        title="Midtrans QRIS Payment"
                        allow="payment"
                      />
                    </div>
                    <a
                      href={payment.deeplink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors"
                    >
                      <span>Buka di Tab Baru jika Tampilan Terpotong</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>
                  </div>
                ) : payment?.qr_string ? (
                  <div className="pt-2">
                    <p className="text-[11px] text-slate-500 mb-2">
                      Scan QRIS di bawah ini dengan m-Banking / e-Wallet apa saja:
                    </p>
                    <div className="relative w-56 h-56 mx-auto p-2 bg-white rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                          payment.qr_string
                        )}`}
                        alt="QRIS Barcode"
                        className="w-48 h-48 mx-auto object-contain"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : isExpired ? (
            /* CASE B: EXPIRED */
            <div className="bg-red-50 rounded-3xl p-6 border border-red-200 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="font-extrabold text-base text-red-900">Pesanan Kedaluwarsa</h2>
              <p className="text-xs text-red-700 max-w-[280px] mx-auto leading-relaxed">
                Batas waktu pembayaran telah habis. Silakan buat pesanan baru.
              </p>
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center px-6 rounded-2xl bg-[#0F2547] hover:bg-[#163566] text-[#FAF8F5] border border-[#D4A843]/50 font-bold text-xs transition-colors"
              >
                Pesan Ulang
              </Link>
            </div>
          ) : (
            /* CASE C: CONFIRMED / PAID / CASH / COOKING / COMPLETED */
            <div className="space-y-6">
              {/* Highlight Queue Number Card */}
              <div className="bg-gradient-to-br from-[#0F2547] via-[#163566] to-[#0A1628] text-white rounded-3xl p-5 shadow-xl border border-[#D4A843]/40 text-center space-y-2 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-[#D4A843]/10 blur-xl pointer-events-none" />
                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold tracking-wider uppercase backdrop-blur-sm border border-white/10">
                  Nomor Antrean Dapur
                </span>

                <div className="text-5xl font-black tracking-tight text-[#D4A843] drop-shadow-sm py-1">
                  {order.queue_number || 'A-001'}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-[#9EC6E3]">
                  <span>Kode: {order.order_code}</span>
                  <button
                    onClick={handleCopyOrderCode}
                    className="p-1 rounded-md hover:bg-white/20 transition-colors"
                    title="Salin Kode Pesanan"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isCash && (
                  <div className="mt-2 pt-2 border-t border-white/10 inline-flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/40 px-3 py-1 rounded-full">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Bayar Tunai di Tempat: {formatIDR(order.gross_amount)}</span>
                  </div>
                )}
              </div>

              {/* 2-Stage Real-Time Stepper */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-4">
                <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                  Progres Pemrosesan Pesanan
                </h2>

                <div className="space-y-4 relative">
                  <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-slate-200" />

                  {STAGES.map((stg, idx) => {
                    const isDone = isCompleted ? true : idx === 0;
                    const isCurrent = isCompleted ? idx === 1 : idx === 0;
                    const Icon = stg.icon;

                    return (
                      <div key={stg.key} className="flex items-start gap-3.5 relative z-10">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                            isCompleted && idx === 1
                              ? 'bg-emerald-500 text-white shadow-md'
                              : isCurrent
                              ? 'bg-[#0F2547] text-[#FAF8F5] ring-4 ring-[#D4A843]/30 shadow-md scale-105 border border-[#D4A843]'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Icon className="w-5 h-5 text-[#D4A843]" />
                        </div>
                        <div className="pt-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isCurrent
                                  ? isCompleted
                                    ? 'text-emerald-700'
                                    : 'text-[#0F2547]'
                                  : isDone
                                  ? 'text-slate-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {stg.label}
                            </span>
                            {isCurrent && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-[#0F2547]/10 text-[#0F2547] border border-[#D4A843]/40 animate-pulse'
                                }`}
                              >
                                {isCompleted ? 'Selesai' : 'Berlangsung'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{stg.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Logistics & Delivery Details */}
          <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-200/70 space-y-2.5 text-xs">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              Informasi Pemenuhan
            </h3>

            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Penerima:</span>
                <span className="font-bold text-slate-800">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WhatsApp:</span>
                <span className="font-bold text-slate-800">{order.customer_whatsapp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Metode Bayar:</span>
                <span className="font-bold text-slate-800">
                  {order.payment_method === 'CASH' ? 'Tunai di Tempat (CASH)' : 'Online QRIS (Midtrans)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gedung Kampus:</span>
                <span className="font-bold text-slate-800">{order.campus_location}</span>
              </div>
              {order.location_notes && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Titik Temu:</span>
                  <span className="font-bold text-slate-800 text-right max-w-[200px]">
                    {order.location_notes}
                  </span>
                </div>
              )}
              {order.order_notes && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Catatan Khusus:</span>
                  <span className="font-bold text-slate-800 text-right max-w-[200px]">
                    {order.order_notes}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Jadwal Tiba:</span>
                <span className="font-bold text-slate-800">{order.scheduled_time}</span>
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-200/70 space-y-2.5 text-xs">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              Detail Menu Pesanan
            </h3>

            <div className="space-y-2 divide-y divide-slate-200/60">
              {(order.items || []).map((it) => (
                <div key={it.id || it.product_id} className="pt-2 first:pt-0 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">
                      {it.quantity}x {it.product_name}
                    </span>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    {formatIDR(it.subtotal || it.unit_price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-slate-900">
              <span>Total Biaya</span>
              <span className="text-sm text-[#0F2547]">{formatIDR(order.gross_amount)}</span>
            </div>
          </div>

          {/* Bukti Serah Terima Makanan (Khusus Pesanan Lunas / Diterima) */}
          {(order.delivery_proof_url || (order.payment_method === 'CASH' && payment?.deeplink_url?.startsWith('http'))) && (
            <div className="bg-white p-4 rounded-3xl border-2 border-emerald-500/40 shadow-sm space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Bukti Serah Terima &amp; Pelunasan Makanan</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pesanan telah resmi diserahkan oleh tim kurir Kedai BGN Bersatoe.
              </p>
              <div className="rounded-2xl overflow-hidden border border-slate-200 mt-1 bg-slate-50">
                <img
                  src={order.delivery_proof_url || payment?.deeplink_url || ''}
                  alt="Bukti Serah Terima Makanan"
                  className="w-full h-44 object-cover"
                />
              </div>
            </div>
          )}

          {/* Action Card: Customer Help & WhatsApp Contact */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-3xl p-4 text-center space-y-2.5 shadow-xs">
            <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-extrabold text-xs">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Butuh Bantuan atau Ingin Bertanya?</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed max-w-[320px] mx-auto">
              Tim Kedai BGN Bersatoe siap melayani pertanyaan seputar pesanan, titik temu kurir, atau konfirmasi pembayaran Anda.
            </p>
            <a
              href={`https://wa.me/6285716160860?text=${encodeURIComponent(
                `Halo Kak Alif (Admin Kedai BGN Bersatoe)! Saya ingin menanyakan status pesanan saya:\n• Kode Pesanan: ${order.order_code}\n• Nomor Antrean: ${order.queue_number || '-'}\n• Nama: ${order.customer_name}\n• Kampus: ${order.campus_location}\n• Jadwal Tiba: ${order.scheduled_time}\n• Total: ${formatIDR(order.gross_amount)}\n\nMohon info update pesanannya yaa kak. Terima kasih!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-98"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hubungi Kak Alif (+62 857-1616-0860)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
