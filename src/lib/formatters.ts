// Pure client-safe formatters (currency, time, phone)

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWIB(dateString?: string | null): string {
  const d = dateString ? new Date(dateString) : new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('id-ID', options).formatToParts(d);
  const find = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${find('year')}-${find('month')}-${find('day')} ${find('hour')}:${find('minute')}:${find('second')}`;
}

export function formatTo62Phone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.substring(1);
  }
  if (cleaned.startsWith('62')) {
    return cleaned;
  }
  return '62' + cleaned;
}
