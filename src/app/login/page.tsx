'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Masukkan password admin.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(redirectTarget);
        router.refresh();
      } else {
        setErrorMsg(data.message || 'Password yang Anda masukkan salah.');
      }
    } catch {
      setErrorMsg('Terjadi kendala jaringan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xl p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0F2547] via-[#D4A843] to-[#0F2547]" />

        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-[#D4A843]/30 bg-[#0A1628] shadow-md mb-4">
            <Image
              src="/images/bgn-logo.jpg"
              alt="Logo Kedai BGN Bersatoe"
              width={64}
              height={64}
              className="object-cover w-full h-full"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F2547]/5 border border-[#0F2547]/10 text-[#0F2547] text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4A843]" />
            Portal Khusus Tim
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-[#0F2547] tracking-tight">
            KEDAI BGN BERSATOE
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Masuk untuk mengakses antrean pesanan, stok kampus, dan rekap keuangan.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide"
            >
              Password Admin
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password admin"
                autoComplete="current-password"
                autoFocus
                className="w-full pl-10 pr-11 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4A843]/30 focus:border-[#0F2547] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Default password lokal: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono">bgnsukses777</code>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0F2547] text-[#FAF8F5] hover:bg-[#163566] active:scale-[0.99] font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D4A843]" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk ke Dashboard</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#0F2547] font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Toko
          </Link>
          <span className="text-[11px] text-slate-400 font-medium">
            Sistem Internal v1.0
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#D4A843]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#0F2547]/5 blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#0F2547]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
