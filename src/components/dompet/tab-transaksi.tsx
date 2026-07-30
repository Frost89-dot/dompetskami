'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDays, List, BarChart3, Bookmark, ChevronLeft, ChevronRight, BookmarkIcon, X, Filter, Trash2, Edit3, ArrowLeftRight } from 'lucide-react'
import { formatRupiah, formatDate, getDayName, getMonthName, changePeriode, OWNER_BG_COLORS, getPercentage, formatTime } from '@/lib/format'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { AlertAlertDialog } from './alert-dialog'
import { useToast } from '@/hooks/use-toast'

const VIEW_TABS = [
  { id: 'daily' as const, icon: List, label: 'Harian' },
  { id: 'calendar' as const, icon: CalendarDays, label: 'Kalender' },
  { id: 'summary' as const, icon: BarChart3, label: 'Ringkasan' },
  { id: 'bookmark' as const, icon: Bookmark, label: 'Bookmark' },
]

const CHART_COLORS = ['#3B82F6', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316', '#6366F1', '#14B8A6']

export function TabTransaksi() {
  const { txView, setTxView, periode, setPeriode, setSelectedTxId, filterOpen, setFilterOpen, refreshKey, triggerRefresh, currentUser } = useAppStore()
  const { toast } = useToast()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterAset, setFilterAset] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [filterPemilik, setFilterPemilik] = useState('')
  const [asets, setAsets] = useState<any[]>([])
  const [kategories, setKategories] = useState<any[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editTx, setEditTx] = useState<any>(null)

  const loadFilters = async () => {
    const [aRes, kRes] = await Promise.all([
      fetch('/api/aset'),
      fetch('/api/kategori'),
    ])
    const aJson = await aRes.json()
    const kJson = await kRes.json()
    setAsets(aJson.all || [])
    setKategories(kJson.all || [])
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ view: txView, bulan: periode })
      if (filterAset) params.set('asetId', filterAset)
      if (filterKategori) params.set('kategoriId', filterKategori)
      if (filterPemilik) params.set('pemilik', filterPemilik)
      const res = await fetch(`/api/transaksi?${params}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [txView, periode, filterAset, filterKategori, filterPemilik, refreshKey])

  useEffect(() => { loadFilters() }, [])
  useEffect(() => { loadData() }, [loadData])

  const toggleBookmark = async (id: string, current: boolean) => {
    await fetch(`/api/transaksi/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBookmark: !current }),
    })
    triggerRefresh()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/transaksi/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    triggerRefresh()
    toast({ title: 'Transaksi dihapus' })
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
            <button onClick={() => setPeriode(changePeriode(periode, -1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm md:text-base font-bold text-gray-900 min-w-[120px] md:min-w-[160px] text-center">{getMonthName(periode)}</span>
            <button onClick={() => setPeriode(changePeriode(periode, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button onClick={() => setFilterOpen(true)} className="p-2 hover:bg-gray-100 rounded-xl">
            <Filter className="w-4 h-4 text-gray-500" />
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
            >
              <v.icon className="w-3.5 h-3.5" />{v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 pb-24 md:pb-8">
        <div className="p-4 md:p-6 tab-content">
          {txView === 'daily' && <DailyView data={data} onBookmark={toggleBookmark} onEdit={setEditTx} onDelete={setDeleteId} />}
          {txView === 'calendar' && <CalendarView data={data} />}
          {txView === 'summary' && <SummaryView data={data} />}
          {txView === 'bookmark' && <BookmarkView data={data} onBookmark={toggleBookmark} onEdit={setEditTx} onDelete={setDeleteId} />}
        </div>
      </ScrollArea>

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-sm">Filter Lanjutan</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Aset/Rekening</label>
              <Select value={filterAset} onValueChange={setFilterAset}>
                <SelectTrigger><SelectValue placeholder="Semua Aset" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aset</SelectItem>
                  {asets.map(a => <SelectItem key={a.id} value={a.id}>{a.icon} {a.namaAset}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Kategori</label>
              <Select value={filterKategori} onValueChange={setFilterKategori}>
                <SelectTrigger><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {kategories.map(k => <SelectItem key={k.id} value={k.id}>{k.icon} {k.namaKategori}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Pemilik</label>
              <Select value={filterPemilik} onValueChange={setFilterPemilik}>
                <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="Suami">Suami</SelectItem>
                  <SelectItem value="Istri">Istri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { loadData(); setFilterOpen(false) }} className="w-full">Terapkan Filter</Button>
            <Button variant="ghost" onClick={() => { setFilterAset(''); setFilterKategori(''); setFilterPemilik(''); setFilterOpen(false) }} className="w-full text-gray-500">Reset Filter</Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertAlertDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Hapus Transaksi" description="Yakin ingin menghapus transaksi ini? Aksi ini tidak dapat dibatalkan." />
    </div>
  )
}

function DailyView({ data, onBookmark, onEdit, onDelete }: any) {
  if (!data?.groups?.length) return <EmptyState message="Belum ada transaksi bulan ini" />
  return (
    <div className="space-y-4">
      {data.groups.map((g: any) => (
        <div key={g.date}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs md:text-sm font-semibold text-gray-700">{getDayName(g.date)}, {formatDate(g.date)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {g.dayIncome > 0 && <span className="text-emerald-600 font-medium">+{formatRupiah(g.dayIncome)}</span>}
              {g.dayExpense > 0 && <span className="text-gray-500 font-medium">-{formatRupiah(g.dayExpense)}</span>}
            </div>
          </div>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
            {g.transactions.map((tx: any) => (
              <TxRow key={tx.id} tx={tx} onBookmark={onBookmark} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </Card>
        </div>
      ))}
    </div>
  )
}

function CalendarView({ data }: any) {
  const [y, m] = data?.periode?.split('-').map(Number) || []
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
  if (!data) return null
  const chartData = (data.categoryBreakdown || []).map((c: any) => ({
    name: c.namaKategori || 'Lainnya',
    value: c.nominal,
    color: c.warna || '#6B7280',
  }))
  const budgetItems = data.budgetProgress || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] md:text-xs text-gray-400 font-medium">Total Pemasukan</p>
            <p className="text-base md:text-lg font-bold text-emerald-600 mt-0.5">{formatRupiah(data.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] md:text-xs text-gray-400 font-medium">Total Pengeluaran</p>
            <p className="text-base md:text-lg font-bold text-gray-900 mt-0.5">{formatRupiah(data.totalExpense)}</p>
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
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatRupiah(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Sisa</p>
                  <p className="text-sm md:text-base font-bold text-gray-700">{formatRupiah(data.totalIncome - data.totalExpense)}</p>
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
                const pct = getPercentage(b.nominalTerpakai, b.nominalAnggaran)
                const overBudget = pct > 100
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{b.kategori?.icon} {b.kategori?.namaKategori}</span>
                      <span className={`text-xs font-medium ${overBudget ? 'text-red-500' : 'text-gray-400'}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-gray-400">{formatRupiah(b.nominalTerpakai)}</span>
                      <span className="text-[10px] text-gray-400">{formatRupiah(b.nominalAnggaran)}</span>
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

function BookmarkView({ data, onBookmark, onEdit, onDelete }: any) {
  const txs = data?.transactions || []
  if (!txs.length) return <EmptyState message="Belum ada transaksi di-bookmark" />
  return (
    <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
      {txs.map((tx: any) => (
        <TxRow key={tx.id} tx={tx} onBookmark={onBookmark} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </Card>
  )
}

function TxRow({ tx, onBookmark, onEdit, onDelete }: any) {
  const isTransfer = tx.sumberInput === 'Transfer'
  return (
    <div className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-3 md:py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
      <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gray-50 flex items-center justify-center text-base md:text-lg flex-shrink-0">
        {isTransfer ? '🔄' : (tx.kategori?.icon || '📦')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{tx.deskripsi}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-400">{formatTime(tx.tanggalWaktu)}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{tx.aset?.namaAset}</span>
          {isTransfer && tx.asetTujuan && (
            <>
              <ArrowLeftRight className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-500 font-medium">{tx.asetTujuan.namaAset}</span>
            </>
          )}
          <Badge variant="secondary" className={`text-[10px] px-2 py-0 h-5 ${OWNER_BG_COLORS[tx.user?.nama || 'Bersama']}`}>
            {tx.user?.nama || 'Bersama'}
          </Badge>
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
          <button onClick={() => onBookmark(tx.id, tx.isBookmark)} className="p-1 hover:bg-gray-100 rounded">
            <BookmarkIcon className={`w-3.5 h-3.5 ${tx.isBookmark ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
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
