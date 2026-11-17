'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

interface CustomTimePickerProps {
  value: string;
  onChange: (newValue: string) => void;
}

const HOURS = ['09', '10', '11', '12', '13', '14', '15', '16', '17'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export default function CustomTimePicker({ value, onChange }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse jam dan menit dari nilai format "HH:MM WIB"
  const parsed = value.match(/^(\d{1,2}):(\d{2})/);
  const currentHour = parsed ? parsed[1].padStart(2, '0') : '12';
  const currentMinute = parsed ? parsed[2] : '00';

  const [selectedHour, setSelectedHour] = useState(currentHour);
  const [selectedMinute, setSelectedMinute] = useState(currentMinute);

  useEffect(() => {
    if (parsed) {
      setSelectedHour(parsed[1].padStart(2, '0'));
      setSelectedMinute(parsed[2]);
    }
  }, [value]);

  // Tutup dropdown jika klik di luar area
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectHour = (h: string) => {
    setSelectedHour(h);
    onChange(`${h}:${selectedMinute} WIB`);
  };

  const handleSelectMinute = (m: string) => {
    setSelectedMinute(m);
    onChange(`${selectedHour}:${m} WIB`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Box Input Tampilan Waktu Sesuai Referensi */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'border-[#0F2547] ring-2 ring-[#D4A843]/30 bg-white'
            : 'border-slate-200 bg-white hover:bg-slate-50'
        }`}
        aria-label="Pilih Jam Pengantaran"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-black text-[#0F2547] tracking-wider">
            {value ? value : 'Pilih Jam'}
          </span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            WIB
          </span>
        </div>

        {/* Ikon Jam Lingkaran Sesuai Lingkaran Merah pada Gambar */}
        <div className="w-8 h-8 rounded-full border border-slate-300 bg-slate-50 flex items-center justify-center text-[#0F2547] hover:bg-slate-100 transition-colors shrink-0">
          <Clock className="w-4 h-4 text-[#0F2547]" />
        </div>
      </button>

      {/* Popover Dropdown Pemilih Jam dan Menit */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-full sm:w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
              Pilih Jam &amp; Menit
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {selectedHour}:{selectedMinute} WIB
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Kolom Jam */}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Jam
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {HOURS.map((h) => {
                  const isSel = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#0F2547] text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kolom Menit */}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Menit
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {MINUTES.map((m) => {
                  const isSel = selectedMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#0F2547] text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 rounded-xl bg-[#0F2547] hover:bg-[#163566] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Selesai Memilih
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
