'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDays, List, BarChart3, Bookmark, ChevronLeft, ChevronRight, BookmarkIcon, Filter, ArrowLeftRight, Loader2 } from 'lucide-react'
import { formatRupiah, formatDate, getDayName, getMonthName, changePeriode, OWNER_BG_COLORS, getPercentage, formatTime } from '@/lib/format'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertAlertDialog } from './alert-dialog'
import { useToast } from '@/hooks/use-toast'

const VIEW_TABS = [
  { id: 'daily' as const, icon: List, label: 'Harian' },
  { id: 'calendar' as const, icon: CalendarDays, label: 'Kalender' },
  { id: 'summary' as const, icon: BarChart3, label: 'Ringkasan' },
  { id: 'bookmark' as const, icon: Bookmark, label: 'Bookmark' },
]

export function TabTransaksi() {
  const { 
    txView, setTxView, periode, setPeriode, filterOpen, setFilterOpen, 
    refreshKey, triggerRefresh, currentUser 
  } = useAppStore()
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterAset, setFilterAset] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [filterPemilik, setFilterPemilik] = useState('')
  const [asets, setAsets] = useState<any[]>([])
  const [kategories, setKategories] = useState<any[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadFilters = async () => {
    try {
      const [aRes, kRes] = await Promise.all([
        fetch('/api/aset'),
        fetch('/api/kategori'),
      ])
      
      if (!aRes.ok || !kRes.ok) throw new Error('Failed to fetch filters')
      
      const aJson = await aRes.json()
      const kJson = await kRes.json()
      setAsets(aJson.all || [])
      setKategories(kJson.all || [])
    } catch (e) {
      console.error('Error loading filters:', e)
      toast({ title: 'Gagal memuat filter', variant: 'destructive' })
    }
  }

  const loadData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    try {
      const params = new URLSearchParams({ view: txView, bulan: periode })
      // Only add filters if they have actual values (not "all")
      if (filterAset && filterAset !== 'all') params.set('asetId', filterAset)
      if (filterKategori && filterKategori !== 'all') params.set('kategoriId', filterKategori)
      if (filterPemilik && filterPemilik !== 'all') params.set('pemilik', filterPemilik)
      
      const res = await fetch(`/api/transaksi?${params}`, {
        signal: abortControllerRef.current.signal
      })
      
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Error loading transactions:', e)
        toast({ title: 'Gagal memuat transaksi', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }, [txView, periode, filterAset, filterKategori, filterPemilik, refreshKey, toast])

  useEffect(() => {
    loadFilters()
  }, [])

  useEffect(() => {
    loadData()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadData])

  const toggleBookmark = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/transaksi/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBookmark: !current }),
      })
      
      if (!res.ok) throw new Error('Failed to toggle bookmark')
      
      toast({ 
        title: current ? 'Bookmark dihapus' : 'Transaksi di-bookmark',
        duration: 2000 
      })
      triggerRefresh()
    } catch (e) {
      console.error('Error toggling bookmark:', e)
      toast({ title: 'Gagal mengubah bookmark', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    
    setDeleting(true)
    try {
      const res = await fetch(`/api/transaksi/${deleteId}`, { method: 'DELETE' })
      
      if (!res.ok) throw new Error('Failed to delete transaction')
      
      toast({ title: 'Transaksi dihapus' })
      setDeleteId(null)
      triggerRefresh()
    } catch (e) {
      console.error('Error deleting transaction:', e)
      toast({ title: 'Gagal menghapus transaksi', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleApplyFilter = () => {
    setFilterOpen(false)
    loadData()
  }

  const handleResetFilter = () => {
    setFilterAset('')
    setFilterKategori('')
    setFilterPemilik('')
    setFilterOpen(false)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-screen">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPeriode(changePeriode(periode, -1))} 
              className="p-1.5 hover:bg-gray-100 rounded-lg"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm md:text-base font-bold text-gray-900 min-w-[120px] md:min-w-[160px] text-center">
              {getMonthName(periode)}
            </span>
            <button 
              onClick={() => setPeriode(changePeriode(periode, 1))} 
              className="p-1.5 hover:bg-gray-100 rounded-lg"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button 
            onClick={() => setFilterOpen(true)} 
            className="p-2 hover:bg-gray-100 rounded-xl relative"
            aria-label="Buka filter"
          >
            <Filter className="w-4 h-4 text-gray-500" />
            {(filterAset || filterKategori || filterPemilik) && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {VIEW_TABS.map(v => (
            <button
              key={v.id}
              onClick={() => setTxView(v.id)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
                txView === v.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              aria-label={`Tampilan ${v.label}`}
              aria-pressed={txView === v.id}
            >
              <v.icon className="w-3.5 h-3.5" />{v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 pb-24 md:pb-8">
        <div className="p-4 md:p-6 tab-content">
          {txView === 'daily' && <DailyView data={data} onBookmark={toggleBookmark} onDelete={setDeleteId} />}
          {txView === 'calendar' && <CalendarView data={data} />}
          {txView === 'summary' && <SummaryView data={data} />}
          {txView === 'bookmark' && <BookmarkView data={data} onBookmark={toggleBookmark} onDelete={setDeleteId} />}
        </div>
      </ScrollArea>

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm">Filter Lanjutan</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Aset/Rekening</label>
              <Select value={filterAset || 'all'} onValueChange={(v) => setFilterAset(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Semua Aset" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aset</SelectItem>
                  {asets.map(a => <SelectItem key={a.id} value={a.id}>{a.icon} {a.namaAset}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Kategori</label>
              <Select value={filterKategori || 'all'} onValueChange={(v) => setFilterKategori(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {kategories.map(k => <SelectItem key={k.id} value={k.id}>{k.icon} {k.namaKategori}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Pemilik</label>
              <Select value={filterPemilik || 'all'} onValueChange={(v) => setFilterPemilik(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="Suami">Suami</SelectItem>
                  <SelectItem value="Istri">Istri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyFilter} className="flex-1">Terapkan Filter</Button>
              <Button variant="ghost" onClick={handleResetFilter} className="flex-1 text-gray-500">
                Reset Filter
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertAlertDialog 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete} 
        title="Hapus Transaksi" 
        description="Yakin ingin menghapus transaksi ini? Aksi ini tidak dapat dibatalkan."
        confirmText={deleting ? "Menghapus..." : "Hapus"}
        confirmDisabled={deleting}
      />
    </div>
  )
}

function DailyView({ data, onBookmark, onDelete }: any) {
  if (!data?.groups?.length) return <EmptyState message="Belum ada transaksi bulan ini" />
  return (
    <div className="space-y-4">
      {data.groups.map((g: any) => (
        <div key={g.date}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs md:text-sm font-semibold text-gray-700">
                {getDayName(g.date)}, {formatDate(g.date)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {g.dayIncome > 0 && <span className="text-emerald-600 font-medium">+{formatRupiah(g.dayIncome)}</span>}
              {g.dayExpense > 0 && <span className="text-gray-500 font-medium">-{formatRupiah(g.dayExpense)}</span>}
            </div>
          </div>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
            {g.transactions.map((tx: any) => (
              <TxRow key={tx.id} tx={tx} onBookmark={onBookmark} onDelete={onDelete} />
            ))}
          </Card>
        </div>
      ))}
    </div>
  )
}

function CalendarView({ data }: any) {
  const [y, m] = data?.periode?.split('-').map(Number) || []
  if (!y || !m) return <EmptyState message="Data tidak tersedia" />
  
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstDay = new Date(y, m - 1, 1).getDay()
  const dayMap = Object.fromEntries((data?.days || []).map((d: any) => [d.day, d]))

  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  return (
    <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-3 md:p-4">
        <div className="grid grid-cols-7 gap-1 md:gap-1.5">
          {dayLabels.map(d => (
            <div key={d} className="text-center text-[10px] md:text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const info = dayMap[day]
            const hasData = info && (info.totalIncome > 0 || info.totalExpense > 0)
            return (
              <div
                key={day}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs md:text-sm relative ${
                  hasData ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500'
                }`}
              >
                {day}
                {info?.totalExpense > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 absolute bottom-1" />
                )}
                {info?.totalIncome > 0 && !info?.totalExpense && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute bottom-1" />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryView({ data }: any) {
  if (!data) return <EmptyState message="Data ringkasan tidak tersedia" />
  
  const chartData = (data.categoryBreakdown || []).map((c: any) => ({
    name: c.namaKategori || 'Lainnya',
    value: c.nominal || 0,
    color: c.warna || '#6B7280',
  }))
  const budgetItems = data.budgetProgress || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] md:text-xs text-gray-400 font-medium">Total Pemasukan</p>
            <p className="text-base md:text-lg font-bold text-emerald-600 mt-0.5">
              {formatRupiah(data.totalIncome || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] md:text-xs text-gray-400 font-medium">Total Pengeluaran</p>
            <p className="text-base md:text-lg font-bold text-gray-900 mt-0.5">
              {formatRupiah(data.totalExpense || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4 md:p-5">
            <p className="text-xs md:text-sm font-semibold text-gray-700 mb-3">Distribusi Pengeluaran</p>
            <div className="h-48 md:h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {chartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatRupiah(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Sisa</p>
                  <p className="text-sm md:text-base font-bold text-gray-700">
                    {formatRupiah((data.totalIncome || 0) - (data.totalExpense || 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {chartData.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-gray-600">{c.name}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-800">{formatRupiah(c.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {budgetItems.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4 md:p-5">
            <p className="text-xs md:text-sm font-semibold text-gray-700 mb-3">Progress Anggaran</p>
            <div className="space-y-3">
              {budgetItems.map((b: any) => {
                const pct = getPercentage(b.nominalTerpakai || 0, b.nominalAnggaran || 1)
                const overBudget = pct > 100
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {b.kategori?.icon} {b.kategori?.namaKategori || 'Tidak ada kategori'}
                      </span>
                      <span className={`text-xs font-medium ${overBudget ? 'text-red-500' : 'text-gray-400'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-gray-400">{formatRupiah(b.nominalTerpakai || 0)}</span>
                      <span className="text-[10px] text-gray-400">{formatRupiah(b.nominalAnggaran || 0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BookmarkView({ data, onBookmark, onDelete }: any) {
  const txs = data?.transactions || []
  if (!txs.length) return <EmptyState message="Belum ada transaksi di-bookmark" />
  return (
    <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
      {txs.map((tx: any) => (
        <TxRow key={tx.id} tx={tx} onBookmark={onBookmark} onDelete={onDelete} />
      ))}
    </Card>
  )
}

function TxRow({ tx, onBookmark, onDelete }: any) {
  const isTransfer = tx.sumberInput === 'Transfer'
  
  return (
    <div className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-3 md:py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
      <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gray-50 flex items-center justify-center text-base md:text-lg flex-shrink-0">
        {isTransfer ? '🔄' : (tx.kategori?.icon || '📦')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{tx.deskripsi || 'Tanpa deskripsi'}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">{formatTime(tx.tanggalWaktu)}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{tx.aset?.namaAset || 'Tidak diketahui'}</span>
          {isTransfer && tx.asetTujuan && (
            <>
              <ArrowLeftRight className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-500 font-medium">{tx.asetTujuan.namaAset}</span>
            </>
          )}
          {tx.user?.nama && (
            <Badge variant="secondary" className={`text-[10px] px-2 py-0 h-5 ${OWNER_BG_COLORS[tx.user.nama] || ''}`}>
              {tx.user.nama}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 flex items-center gap-2">
        <span className={`text-sm font-semibold ${
          isTransfer ? 'text-blue-600' :
          tx.tipe === 'Pemasukan' ? 'text-emerald-600' : 'text-gray-900'
        }`}>
          {isTransfer ? formatRupiah(tx.nominal) : `${tx.tipe === 'Pemasukan' ? '+' : '-'}${formatRupiah(tx.nominal)}`}
        </span>
        <div className="flex flex-col gap-0.5">
          <button 
            onClick={() => onBookmark(tx.id, tx.isBookmark)} 
            className="p-1 hover:bg-gray-100 rounded"
            aria-label={tx.isBookmark ? 'Hapus bookmark' : 'Tambah bookmark'}
          >
            <BookmarkIcon className={`w-3.5 h-3.5 ${tx.isBookmark ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
          </button>
          <button 
            onClick={() => onDelete(tx.id)} 
            className="p-1 hover:bg-red-50 rounded"
            aria-label="Hapus transaksi"
          >
            <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          {isTransfer ? (
            <span className="text-[8px] text-blue-500 font-medium bg-blue-50 px-1.5 rounded text-center">Transfer</span>
          ) : tx.sumberInput === 'AI' ? (
            <span className="text-[8px] text-purple-500 font-medium bg-purple-50 px-1.5 rounded text-center">AI</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-20 text-gray-400">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <List className="w-8 h-8 text-gray-300" />
      </div>
      <p className="text-sm">{message}</p>
    </div>
  )
}
