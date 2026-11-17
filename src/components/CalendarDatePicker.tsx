'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, Check } from 'lucide-react';

interface DateOption {
  dateString: string;
  displayLabel: string;
  dayName: string;
}

interface CalendarDatePickerProps {
  availableDates: DateOption[];
  selectedDate: DateOption;
  onSelectDate: (date: DateOption) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_HEADERS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function CalendarDatePicker({
  availableDates,
  selectedDate,
  onSelectDate,
}: CalendarDatePickerProps) {
  // Tentukan bulan awal berdasarkan tanggal aktif pertama
  const initialDate = availableDates.length > 0
    ? new Date(availableDates[0].dateString + 'T00:00:00')
    : new Date();

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Hitung jumlah hari dalam bulan dan offset hari pertama
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Buat array tanggal kosong untuk padding hari pertama
  const leadingBlanks = Array.from({ length: firstDayIndex }, (_, i) => i);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      {/* Header Bulan & Navigasi */}
      <div className="flex items-center justify-between px-1">
        <div className="font-extrabold text-xs text-[#0F2547]">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Kalender */}
      <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200">
        {/* Header Nama Hari */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {DAY_HEADERS.map((dh) => (
            <div key={dh} className="text-[10px] font-bold text-slate-400 py-0.5">
              {dh}
            </div>
          ))}
        </div>

        {/* Tanggal-tanggal */}
        <div className="grid grid-cols-7 gap-1">
          {leadingBlanks.map((b) => (
            <div key={`blank-${b}`} className="h-9" />
          ))}

          {monthDays.map((dayNum) => {
            const mStr = String(currentMonth + 1).padStart(2, '0');
            const dStr = String(dayNum).padStart(2, '0');
            const dateStr = `${currentYear}-${mStr}-${dStr}`;

            const matchedDate = availableDates.find((ad) => ad.dateString === dateStr);
            const isAvailable = Boolean(matchedDate);
            const isSelected = selectedDate?.dateString === dateStr;

            if (isAvailable && matchedDate) {
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onSelectDate(matchedDate)}
                  className={`h-9 rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F2547] text-white font-black shadow-xs ring-2 ring-[#D4A843]/60 scale-102'
                      : 'bg-white text-slate-900 font-extrabold border border-amber-300 hover:bg-amber-50 hover:border-amber-400'
                  }`}
                  title={`Hari Buka PO: ${matchedDate.displayLabel}`}
                >
                  <span className="text-xs leading-none">{dayNum}</span>
                  <span
                    className={`w-1 h-1 rounded-full mt-1 ${
                      isSelected ? 'bg-[#D4A843]' : 'bg-emerald-500'
                    }`}
                  />
                </button>
              );
            }

            // Hari libur / tidak melayani PO (muted dan unclickable)
            return (
              <div
                key={dateStr}
                className="h-9 rounded-lg flex items-center justify-center text-slate-300 text-xs font-normal cursor-not-allowed select-none bg-slate-100/40"
                title="Libur / Tidak melayani PO"
              >
                {dayNum}
              </div>
            );
          })}
        </div>
      </div>

      {/* Keterangan & Tanggal Terpilih */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Buka PO</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            <span>Libur</span>
          </div>
        </div>

        {selectedDate && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-[11px]">
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{selectedDate.displayLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
