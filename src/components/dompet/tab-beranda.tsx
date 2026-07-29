'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Target, ArrowRight, Sparkles, Bookmark } from 'lucide-react'
import { formatRupiah, formatDateShort, formatTime, OWNER_BG_COLORS, getPercentage } from '@/lib/format'
import { ScrollArea } from '@/components/ui/scroll-area'

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
  const { periode, setPeriode, setActiveTab, setTxView, setSelectedTxId } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  const loadInsight = useCallback(async () => {
    setInsightLoading(true)
    try {
      const res = await fetch('/api/ai/insight')
      const json = await res.json()
      setInsight(json.insight)
    } catch {
      setInsight('Insight tidak tersedia saat ini.')
    }
    setInsightLoading(false)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadData().catch(() => {})
    return () => controller.abort()
  }, [periode, loadData])

  const incomeChange = data?.lastIncome ? getPercentage(data.income - data.lastIncome, data.lastIncome) : 0
  const expenseChange = data?.lastExpense ? getPercentage(data.expense - data.lastExpense, data.lastExpense) : 0

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  if (!data) return null

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="p-4 pb-28 space-y-4 tab-content">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">DompetKami</h1>
            <p className="text-xs text-gray-400 mt-0.5">Keuangan Keluarga</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('transaksi')}
              className="text-xs text-blue-600 font-medium flex items-center gap-0.5 bg-blue-50 px-3 py-1.5 rounded-full"
            >
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Net Worth Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <p className="text-blue-100 text-xs font-medium">Total Kekayaan (Net Worth)</p>
            <p className="text-2xl font-bold mt-1 tracking-tight">{formatRupiah(data.netWorth)}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-100">Pemasukan</p>
                  <p className="text-xs font-semibold">{formatRupiah(data.income)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingDown className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-100">Pengeluaran</p>
                  <p className="text-xs font-semibold">{formatRupiah(data.expense)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison with last month */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">vs Bulan Lalu</p>
            <div className="flex items-center justify-between mt-2 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-gray-500">Pemasukan</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{formatRupiah(data.income)}</p>
                <span className={`text-[10px] font-medium ${incomeChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {incomeChange >= 0 ? '+' : ''}{incomeChange}%
                </span>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs text-gray-500">Pengeluaran</span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{formatRupiah(data.expense)}</p>
                <span className={`text-[10px] font-medium ${expenseChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {expenseChange >= 0 ? '+' : ''}{expenseChange}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Targets */}
        {data.targets.length > 0 && (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4">
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

        {/* AI Insight */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <button
              onClick={loadInsight}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-semibold text-gray-700">Insight AI</p>
              </div>
              <span className="text-[10px] text-blue-600 font-medium">{insight ? 'Refresh' : 'Lihat Insight'}</span>
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
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-700">Transaksi Terakhir</p>
              <button
                onClick={() => { setActiveTab('transaksi'); setTxView('daily') }}
                className="text-[10px] text-blue-600 font-medium"
              >
                Semua
              </button>
            </div>
            <div className="space-y-1">
              {data.recentTransactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-base flex-shrink-0">
                    {tx.kategori?.icon || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{tx.deskripsi}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400">{formatDateShort(tx.tanggalWaktu)}</span>
                      <span className="text-[10px] text-gray-300">·</span>
                      <span className="text-[10px] text-gray-400">{tx.aset?.namaAset}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-1">
                    {tx.isBookmark && <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    <span className={`text-xs font-semibold ${tx.tipe === 'Pemasukan' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {tx.tipe === 'Pemasukan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}