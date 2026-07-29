export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getDayName(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(date))
}

export function getCurrentPeriode(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthName(periode: string): string {
  const [y, m] = periode.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1))
}

export function changePeriode(periode: string, delta: number): string {
  const [y, m] = periode.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getPercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

export const OWNER_COLORS: Record<string, string> = {
  Suami: '#2563EB',
  Istri: '#EC4899',
  Bersama: '#6B7280',
}

export const OWNER_BG_COLORS: Record<string, string> = {
  Suami: 'bg-blue-100 text-blue-700',
  Istri: 'bg-pink-100 text-pink-700',
  Bersama: 'bg-gray-100 text-gray-700',
}