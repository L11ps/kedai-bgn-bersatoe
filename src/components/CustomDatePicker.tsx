'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  existingHolidays?: string[];
  disabled?: boolean;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal...',
  existingHolidays = [],
  disabled = false,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view year and month based on value or today
  const [viewDate, setViewDate] = useState(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  // Sync viewDate when value changes from outside
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewDate(new Date(y, m - 1, 1));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Helper to format date in Indonesian
  const formatDisplay = (dateString: string) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '';
    const [y, m, d] = dateString.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Build calendar matrix
  // 1st day of month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  // getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We want Monday = 0, ..., Sunday = 6
  let startingDayIndex = firstDayOfMonth.getDay() - 1;
  if (startingDayIndex === -1) startingDayIndex = 6;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < startingDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleSelectDay = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  return (
    <div className="relative flex-1" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium bg-white flex items-center justify-between text-left hover:border-[#0F2547] focus:outline-none focus:border-[#0F2547] transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-[#0F2547] shrink-0" />
          {value ? (
            <span className="text-slate-800 font-semibold truncate">
              {formatDisplay(value)} <span className="text-slate-400 font-mono text-[11px]">({value})</span>
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        {value && !disabled ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 hover:text-rose-600 text-slate-400 transition-colors"
            title="Hapus pilihan"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <span className="text-slate-400 text-[10px]">▼</span>
        )}
      </button>

      {/* Web-Based Calendar Popover (Bukan Browser Native) */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-xs font-black text-[#0F2547]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_LABELS.map((day, idx) => {
              const isOperating = idx === 1 || idx === 2 || idx === 3;
              return (
                <div
                  key={day}
                  className={`text-[10px] font-bold py-1 ${
                    isOperating ? 'text-[#0F2547] font-black' : 'text-slate-400 font-medium'
                  }`}
                  title={isOperating ? 'Hari Operasional (Buka)' : 'Hari Libur Operasional'}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Date Matrix */}
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="h-8" />;
              }

              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;
              const isHoliday = existingHolidays.includes(dateStr);
              // Calculate day of week (Monday=0 ... Sunday=6)
              const cellDayIndex = (startingDayIndex + day - 1) % 7;
              const isOperatingDay = cellDayIndex === 1 || cellDayIndex === 2 || cellDayIndex === 3;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`relative h-8 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#0F2547] text-white shadow-sm font-bold'
                      : isHoliday
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold hover:bg-rose-200'
                      : !isOperatingDay
                      ? 'bg-slate-50 text-slate-400 hover:bg-slate-100/80 font-normal'
                      : 'text-slate-900 bg-emerald-50/40 hover:bg-emerald-50 font-bold'
                  }`}
                  title={
                    isHoliday
                      ? `${dateStr} (Sudah diatur libur)`
                      : !isOperatingDay
                      ? `${dateStr} (Non-operasional: Kedai hanya buka Sel, Rab, Kam)`
                      : `${dateStr} (Hari Operasional: Buka)`
                  }
                >
                  <span>{day}</span>
                  {/* Indicators */}
                  <div className="flex items-center gap-0.5 absolute bottom-0.5">
                    {isToday && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#D4A843]" />
                    )}
                    {isHoliday && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-rose-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend and Footer */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Buka (Sel, Rab, Kam)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Libur
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className="text-[#0F2547] font-bold hover:underline"
            >
              Bulan Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
