'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Target, ArrowRight, Sparkles, Bookmark, Wallet, Loader2 } from 'lucide-react'
import { formatRupiah, formatDateShort, getPercentage } from '@/lib/format'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'

interface DashboardData {
  netWorth: number
  income: number
  expense: number
  lastIncome: number
  lastExpense: number
  recentTransactions: any[]
  targets: any[]
  budgets: any[]
}

export function TabBeranda() {
  const { periode, setActiveTab, setTxView } = useAppStore()
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('Error loading dashboard:', e)
      toast({
        title: 'Gagal memuat data',
        description: 'Silakan coba lagi nanti',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadInsight = useCallback(async () => {
    setInsightLoading(true)
    try {
      const res = await fetch('/api/ai/insight')
      if (!res.ok) throw new Error('Failed to fetch insight')
      const json = await res.json()
      setInsight(json.insight)
    } catch (e) {
      console.error('Error loading insight:', e)
      setInsight('Insight tidak tersedia saat ini.')
      toast({
        title: 'Gagal memuat insight',
        description: 'AI insight tidak tersedia',
        variant: 'default'
      })
    } finally {
      setInsightLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [periode, loadData])

  const incomeChange = data?.lastIncome ? getPercentage(data.income - data.lastIncome, data.lastIncome) : 0
  const expenseChange = data?.lastExpense ? getPercentage(data.expense - data.lastExpense, data.lastExpense) : 0

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (!data) return null

  return (
    <ScrollArea className="h-[calc(100vh-2rem)] md:h-screen">
      <div className="p-4 md:p-6 pb-28 md:pb-8 space-y-4 tab-content">
        {/* Header - mobile */}
        <div className='flex items-center justify-between md:hidden'>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DompetKami</h1>
            <p className="text-xs text-gray-400 mt-0.5">Keuangan Keluarga</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('transaksi')}
              className="text-xs text-blue-600 font-medium flex items-center gap-0.5 bg-blue-50 px-3 py-1.5 rounded-full"
              aria-label="Lihat semua transaksi"
            >
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Net Worth Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className='flex items-center justify-between'>
              <div>
                <p className="text-blue-100 text-xs font-medium">Total Kekayaan (Net Worth)</p>
                <p className="text-2xl md:text-3xl font-bold mt-1 tracking-tight">{formatRupiah(data.netWorth)}</p>
              </div>
              <div className='hidden md:flex items-center gap-1.5'>
                <button
                  onClick={() => setActiveTab('transaksi')}
                  className="text-xs text-blue-100 font-medium flex items-center gap-1 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors"
                  aria-label="Lihat transaksi"
                >
                  Lihat Transaksi <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-200">Pemasukan</p>
                  <p className="text-sm font-semibold">{formatRupiah(data.income)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-200">Pengeluaran</p>
                  <p className="text-sm font-semibold">{formatRupiah(data.expense)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison with last month - Desktop grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 md:p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">vs Bulan Lalu</p>
              <div className="flex items-center justify-between mt-3 gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-gray-500">Pemasukan</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mt-0.5">{formatRupiah(data.income)}</p>
                  <span className={`text-xs font-medium ${incomeChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {incomeChange >= 0 ? '+' : ''}{incomeChange}%
                  </span>
                </div>
                <div className="w-px h-12 bg-gray-100" />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs text-gray-500">Pengeluaran</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mt-0.5">{formatRupiah(data.expense)}</p>
                  <span className={`text-xs font-medium ${expenseChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {expenseChange >= 0 ? '+' : ''}{expenseChange}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Insight - moved up on desktop */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 md:p-5">
              <button
                onClick={loadInsight}
                disabled={insightLoading}
                className="flex items-center justify-between w-full disabled:opacity-70"
                aria-label={insight ? 'Refresh insight AI' : 'Lihat insight AI'}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-semibold text-gray-700">Insight AI</p>
                </div>
                <span className="text-xs text-blue-600 font-medium">
                  {insightLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin inline" />
                  ) : insight ? (
                    'Refresh'
                  ) : (
                    'Lihat Insight'
                  )}
                </span>
              </button>
              {insightLoading && (
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              )}
              {insight && !insightLoading && (
                <div className="mt-3 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                  {insight}
                </div>
              )}
              {!insight && !insightLoading && (
                <div className="mt-3 text-xs text-gray-400 text-center py-2">
                  Klik untuk melihat insight AI tentang keuanganmu
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Targets + Budgets side by side on desktop */}
        {((data.targets && data.targets.length > 0) || (data.budgets && data.budgets.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.targets && data.targets.length > 0 && (
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-semibold text-gray-700">Target Keuangan</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{data.targets.length} aktif</span>
                  </div>
                  <div className="space-y-3">
                    {data.targets.slice(0, 3).map((t: any) => {
                      const pct = getPercentage(t.nominalTerkumpul, t.nominalTarget)
                      return (
                        <div key={t.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{t.namaTarget}</span>
                            <span className="text-[10px] text-gray-400">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {formatRupiah(t.nominalTerkumpul)} / {formatRupiah(t.nominalTarget)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.budgets && data.budgets.length > 0 && (
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs font-semibold text-gray-700">Progress Anggaran</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{data.budgets.length} kategori</span>
                  </div>
                  <div className="space-y-3">
                    {data.budgets.slice(0, 3).map((b: any) => {
                      const pct = getPercentage(b.nominalTerpakai, b.nominalAnggaran)
                      const overBudget = pct > 100
                      return (
                        <div key={b.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">
                              {b.kategori?.icon} {b.kategori?.namaKategori || 'Tidak ada kategori'}
                            </span>
                            <span className={`text-[10px] font-medium ${overBudget ? 'text-red-500' : 'text-gray-400'}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
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
        )}

        {/* Recent Transactions */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Transaksi Terakhir</p>
              <button
                onClick={() => { setActiveTab('transaksi'); setTxView('daily') }}
                className="text-xs text-blue-600 font-medium hover:text-blue-700"
                aria-label="Lihat semua transaksi"
              >
                Semua
              </button>
            </div>
            {data.recentTransactions && data.recentTransactions.length > 0 ? (
              <div className="space-y-0.5">
                {data.recentTransactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-base flex-shrink-0">
                      {tx.kategori?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.deskripsi || 'Tanpa deskripsi'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400">{formatDateShort(tx.tanggalWaktu)}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{tx.aset?.namaAset || 'Tidak diketahui'}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                      {tx.isBookmark && <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      <span className={`text-sm font-semibold ${tx.tipe === 'Pemasukan' ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {tx.tipe === 'Pemasukan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-sm">
                Belum ada transaksi
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
