'use client';

import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('bgn_cookie_consent');
      if (!consent) {
        setShowConsent(true);
      }
    } catch {
      // Abaikan jika localStorage tidak dapat diakses
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('bgn_cookie_consent', 'accepted');
    } catch {
      // Abaikan
    }
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <aside
      aria-label="Pemberitahuan Cookie dan Penyimpanan Data"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-[#071324]/95 text-slate-100 p-4 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#D4A843]/20 border border-[#D4A843]/40 flex items-center justify-center shrink-0 mt-0.5">
          <Cookie className="w-4 h-4 text-[#D4A843]" />
        </div>
        <div className="flex-1 text-xs space-y-1">
          <div className="font-extrabold text-white text-xs">Pemberitahuan Penyimpanan &amp; Cookies</div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Website ini menggunakan cookies teknis dan penyimpanan browser lokal untuk mengelola keranjang belanja dan keamanan sesi pemesanan Anda. Kami tidak menggunakan cookie pelacak iklan pihak ketiga.
          </p>
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-xl bg-[#D4A843] hover:bg-[#e0b54f] text-[#071324] font-black text-xs transition-colors cursor-pointer"
            >
              Saya Mengerti
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAccept}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
          aria-label="Tutup pemberitahuan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
