'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { BarChart3, Target, StickyNote, Settings, ChevronLeft, Plus, Pin, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { formatRupiah, getMonthName, changePeriode, getPercentage, formatDate } from '@/lib/format'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useToast } from '@/hooks/use-toast'

const MENU_ITEMS = [
  { id: 'statistics' as const, icon: BarChart3, label: 'Statistik', desc: 'Grafik & analisis keuangan', color: 'text-blue-600 bg-blue-50' },
  { id: 'budget' as const, icon: Target, label: 'Tutup Buku & Anggaran', desc: 'Atur batas pengeluaran', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'memo' as const, icon: StickyNote, label: 'Memo', desc: 'Catatan bebas', color: 'text-amber-600 bg-amber-50' },
  { id: 'settings' as const, icon: Settings, label: 'Pengaturan', desc: 'Kustomisasi aplikasi', color: 'text-gray-600 bg-gray-50' },
]

export function TabLainnya() {
  const { lainnyaView, setLainnyaView } = useAppStore()

  if (lainnyaView === 'statistics') return <StatisticsView />
  if (lainnyaView === 'budget') return <BudgetView />
  if (lainnyaView === 'memo') return <MemoView />
  if (lainnyaView === 'settings') return <SettingsView />

  return (
    <ScrollArea className='h-[calc(100vh-2rem)] md:h-screen'>
      <div className='p-4 md:p-6 pb-28 md:pb-8 space-y-3 tab-content'>
        <h2 className='text-lg font-bold text-gray-900'>Lainnya</h2>
        {MENU_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setLainnyaView(item.id)}
            className='w-full'
            aria-label={`Buka ${item.label}`}
          >
            <Card className='border-0 shadow-sm rounded-xl hover:shadow-md transition-shadow'>
              <CardContent className='flex items-center gap-3 p-4'>
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                  <item.icon className='w-5 h-5' />
                </div>
                <div className='text-left flex-1'>
                  <p className='text-sm font-semibold text-gray-800'>{item.label}</p>
                  <p className='text-[10px] text-gray-400'>{item.desc}</p>
                </div>
                <ChevronLeft className='w-4 h-4 text-gray-300 rotate-180' />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}

// ====== STATISTICS VIEW ======
function StatisticsView() {
  const { setLainnyaView, periode, setPeriode } = useAppStore()
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)
  const [txData, setTxData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statPeriod, setStatPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [insight, setInsight] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    try {
      const res = await fetch(`/api/transaksi?view=summary&bulan=${periode}`, {
        signal: abortControllerRef.current.signal
      })
      if (!res.ok) throw new Error('Failed to fetch statistics')
      setTxData(await res.json())
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Error loading statistics:', e)
        toast({ title: 'Gagal memuat statistik', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }, [periode, toast])

  useEffect(() => {
    loadData()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadData])

  const loadInsight = async () => {
    setInsightLoading(true)
    try {
      const res = await fetch('/api/ai/insight')
      if (!res.ok) throw new Error('Failed to fetch insight')
      const json = await res.json()
      setInsight(json.insight)
    } catch (e) {
      console.error('Error loading insight:', e)
      setInsight('Tidak tersedia saat ini')
      toast({ title: 'Gagal memuat insight', variant: 'destructive' })
    } finally {
      setInsightLoading(false)
    }
  }

  const chartData = (txData?.categoryBreakdown || []).map((c: any) => ({
    name: c.namaKategori || 'Lainnya',
    value: c.nominal,
    color: c.warna || '#6B7280',
  }))

  // Trend data: simulate last 6 months
  const trendData = Array.from({ length: 6 }).map((_, i) => {
    const d = changePeriode(periode, i - 5)
    return {
      bulan: getMonthName(d).split(' ')[0],
      pemasukan: Math.random() * 15000000 + 8000000,
      pengeluaran: Math.random() * 8000000 + 2000000,
    }
  })

  return (
    <div className='flex flex-col h-[calc(100vh-2rem)] md:h-screen'>
      <div className='px-4 pt-2 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10'>
        <div className='flex items-center gap-2 mb-2'>
          <button onClick={() => setLainnyaView(null)} className='p-1 hover:bg-gray-100 rounded-lg' aria-label='Kembali'>
            <ChevronLeft className='w-4 h-4 text-gray-600' />
          </button>
          <span className='text-base font-bold text-gray-900'>Statistik</span>
        </div>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <button onClick={() => setPeriode(changePeriode(periode, -1))} className='p-1 hover:bg-gray-100 rounded-lg' aria-label='Bulan sebelumnya'>
              <ChevronLeft className='w-3 h-3 text-gray-500' />
            </button>
            <span className='text-xs font-semibold text-gray-700'>{getMonthName(periode)}</span>
            <button onClick={() => setPeriode(changePeriode(periode, 1))} className='p-1 hover:bg-gray-100 rounded-lg' aria-label='Bulan berikutnya'>
              <ChevronLeft className='w-3 h-3 text-gray-500 rotate-180' />
            </button>
          </div>
          <div className='flex gap-1'>
            <button 
              onClick={() => setStatPeriod('monthly')} 
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                statPeriod === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              Bulanan
            </button>
            <button 
              onClick={() => setStatPeriod('weekly')} 
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                statPeriod === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              Mingguan
            </button>
          </div>
        </div>
      </div>

      <ScrollArea className='flex-1 pb-24 md:pb-8'>
        <div className='p-4 space-y-4 tab-content'>
          {loading ? (
            <div className='space-y-3'>
              <Skeleton className='h-48 rounded-2xl' />
              <Skeleton className='h-48 rounded-2xl' />
            </div>
          ) : (
            <>
              <div className='grid grid-cols-2 gap-3'>
                <Card className='border-0 shadow-sm rounded-xl'>
                  <CardContent className='p-3'>
                    <p className='text-[10px] text-gray-400'>Pemasukan</p>
                    <p className='text-sm font-bold text-emerald-600'>{formatRupiah(txData?.totalIncome || 0)}</p>
                  </CardContent>
                </Card>
                <Card className='border-0 shadow-sm rounded-xl'>
                  <CardContent className='p-3'>
                    <p className='text-[10px] text-gray-400'>Pengeluaran</p>
                    <p className='text-sm font-bold text-gray-900'>{formatRupiah(txData?.totalExpense || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pie Chart */}
              {chartData.length > 0 && (
                <Card className='border-0 shadow-sm rounded-2xl'>
                  <CardContent className='p-4'>
                    <p className='text-xs font-semibold text-gray-700 mb-3'>Distribusi Pengeluaran</p>
                    <div className='h-48'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Pie data={chartData} cx='50%' cy='50%' innerRadius={45} outerRadius={70} dataKey='value' paddingAngle={2}>
                            {chartData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatRupiah(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className='space-y-1.5 mt-2'>
                      {chartData.map((c: any, i: number) => (
                        <div key={i} className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <div className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: c.color }} />
                            <span className='text-[11px] text-gray-600'>{c.name}</span>
                          </div>
                          <span className='text-[11px] font-medium'>{formatRupiah(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Trend Line Chart */}
              <Card className='border-0 shadow-sm rounded-2xl'>
                <CardContent className='p-4'>
                  <p className='text-xs font-semibold text-gray-700 mb-3'>Tren Arus Kas</p>
                  <div className='h-48'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                        <XAxis dataKey='bulan' tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => formatRupiah(v)} />
                        <Line type='monotone' dataKey='pemasukan' stroke='#10B981' strokeWidth={2} dot={{ r: 3 }} />
                        <Line type='monotone' dataKey='pengeluaran' stroke='#EF4444' strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className='flex items-center justify-center gap-4 mt-2'>
                    <div className='flex items-center gap-1'><div className='w-3 h-0.5 bg-emerald-500 rounded' /><span className='text-[10px] text-gray-500'>Pemasukan</span></div>
                    <div className='flex items-center gap-1'><div className='w-3 h-0.5 bg-red-500 rounded' /><span className='text-[10px] text-gray-500'>Pengeluaran</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Insight */}
              <Card className='border-0 shadow-sm rounded-2xl'>
                <CardContent className='p-4'>
                  <button 
                    onClick={loadInsight} 
                    disabled={insightLoading}
                    className='flex items-center gap-1.5 mb-2 disabled:opacity-70'
                    aria-label='Muat insight AI'
                  >
                    <Sparkles className='w-4 h-4 text-amber-500' />
                    <span className='text-xs font-semibold text-gray-700'>Insight AI</span>
                    {insightLoading && <Loader2 className='w-3 h-3 animate-spin ml-1' />}
                  </button>
                  {insightLoading ? (
                    <div className='space-y-2'>
                      <Skeleton className='h-3 w-full' />
                      <Skeleton className='h-3 w-4/5' />
                      <Skeleton className='h-3 w-3/5' />
                    </div>
                  ) : insight ? (
                    <div className='text-xs text-gray-600 leading-relaxed whitespace-pre-line'>{insight}</div>
                  ) : (
                    <p className='text-xs text-gray-400'>Klik untuk melihat insight AI tentang keuangan Anda.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ====== BUDGET VIEW ======
function BudgetView() {
  const { setLainnyaView, periode, setPeriode, currentUser, refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const [budgets, setBudgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addKategoriId, setAddKategoriId] = useState('')
  const [addNominal, setAddNominal] = useState('')
  const [kategories, setKategories] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, kRes] = await Promise.all([
        fetch(`/api/anggaran?periode=${periode}`),
        fetch('/api/kategori'),
      ])
      
      if (!bRes.ok || !kRes.ok) throw new Error('Failed to fetch budget data')
      
      const budgetsData = await bRes.json()
      const kJson = await kRes.json()
      
      setBudgets(Array.isArray(budgetsData) ? budgetsData : [])
      setKategories(kJson.all?.filter((k: any) => k.tipe === 'Pengeluaran') || [])
    } catch (e) {
      console.error('Error loading budgets:', e)
      toast({ title: 'Gagal memuat anggaran', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [periode, toast])

  useEffect(() => { loadData() }, [loadData, refreshKey])

  const addBudget = async () => {
    if (!addKategoriId || !addNominal) {
      toast({ title: 'Lengkapi semua field', variant: 'destructive' })
      return
    }
    
    setSubmitting(true)
    try {
      const res = await fetch('/api/anggaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          periode, 
          kategoriId: addKategoriId, 
          nominalAnggaran: parseFloat(addNominal), 
          dibuatOleh: currentUser || 'system@dompetkami.com'
        }),
      })
      
      if (!res.ok) throw new Error('Failed to add budget')
      
      toast({ title: 'Anggaran ditambahkan' })
      setAddOpen(false)
      setAddKategoriId('')
      setAddNominal('')
      triggerRefresh()
    } catch (e) {
      console.error('Error adding budget:', e)
      toast({ title: 'Gagal menambahkan anggaran', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteBudget = async (id: string) => {
    try {
      const res = await fetch(`/api/anggaran/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete budget')
      toast({ title: 'Anggaran dihapus' })
      triggerRefresh()
    } catch (e) {
      console.error('Error deleting budget:', e)
      toast({ title: 'Gagal menghapus anggaran', variant: 'destructive' })
    }
  }

  const totalBudget = budgets.reduce((s, b) => s + (b.nominalAnggaran || 0), 0)
  const totalUsed = budgets.reduce((s, b) => s + (b.nominalTerpakai || 0), 0)

  return (
    <div className='flex flex-col h-[calc(100vh-2rem)] md:h-screen'>
      <div className='px-4 pt-2 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10'>
        <div className='flex items-center gap-2 mb-2'>
          <button onClick={() => setLainnyaView(null)} className='p-1 hover:bg-gray-100 rounded-lg' aria-label='Kembali'>
            <ChevronLeft className='w-4 h-4 text-gray-600' />
          </button>
          <span className='text-base font-bold text-gray-900'>Anggaran</span>
        </div>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <button onClick={() => setPeriode(changePeriode(periode, -1))} className='p-1 hover:bg-gray-100 rounded-lg' aria-label='Bulan sebelumnya'>
              <ChevronLeft className='w-3 h-3 text-gray-500' />
            </button>
            <span className='text-xs font-semibold text-gray-700'>{getMonthName(periode)}</span>
            <button onClick={() => setPeriode(changePeriode(periode, 1))} className='p-1 hover:bg-gray-100 rounded-lg' aria-label='Bulan berikutnya'>
              <ChevronLeft className='w-3 h-3 text-gray-500 rotate-180' />
            </button>
          </div>
          <button 
            onClick={() => setAddOpen(true)} 
            className='text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1'
          >
            <Plus className='w-3 h-3' />Tambah
          </button>
        </div>
      </div>

      <ScrollArea className='flex-1 pb-24 md:pb-8'>
        <div className='p-4 space-y-4 tab-content'>
          {budgets.length > 0 && (
            <Card className='border-0 shadow-sm rounded-2xl'>
              <CardContent className='p-4'>
                <div className='flex justify-between text-xs mb-1.5'>
                  <span className='text-gray-500'>Total Anggaran</span>
                  <span className='font-semibold'>{formatRupiah(totalUsed)} / {formatRupiah(totalBudget)}</span>
                </div>
                <Progress value={totalBudget > 0 ? Math.min(getPercentage(totalUsed, totalBudget), 100) : 0} className='h-2' />
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className='space-y-2'>
              <Skeleton className='h-16 rounded-xl' />
              <Skeleton className='h-16 rounded-xl' />
            </div>
          ) : budgets.length === 0 ? (
            <div className='text-center py-12 text-gray-400 text-sm'>Belum ada anggaran</div>
          ) : (
            budgets.map(b => {
              const pct = getPercentage(b.nominalTerpakai || 0, b.nominalAnggaran || 1)
              const over = pct > 100
              return (
                <Card key={b.id} className='border-0 shadow-sm rounded-xl'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        <span>{b.kategori?.icon || '📁'}</span>
                        <span className='text-xs font-medium text-gray-800'>{b.kategori?.namaKategori || 'Kategori'}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className={`text-xs font-bold ${over ? 'text-red-500' : 'text-gray-800'}`}>{pct}%</span>
                        <button 
                          onClick={() => deleteBudget(b.id)} 
                          className='p-1 hover:bg-gray-100 rounded'
                          aria-label='Hapus anggaran'
                        >
                          <Trash2 className='w-3 h-3 text-gray-400' />
                        </button>
                      </div>
                    </div>
                    <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                      <div 
                        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                        style={{ width: `${Math.min(pct, 100)}%` }} 
                      />
                    </div>
                    <div className='flex justify-between mt-1.5'>
                      <span className='text-[10px] text-gray-400'>{formatRupiah(b.nominalTerpakai || 0)} terpakai</span>
                      <span className='text-[10px] text-gray-400'>
                        Sisa {formatRupiah(Math.max(0, (b.nominalAnggaran || 0) - (b.nominalTerpakai || 0)))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </ScrollArea>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Anggaran</DialogTitle></DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label className='text-xs'>Kategori</Label>
              <Select value={addKategoriId} onValueChange={setAddKategoriId}>
                <SelectTrigger className='mt-1'><SelectValue placeholder='Pilih kategori' /></SelectTrigger>
                <SelectContent>
                  {kategories.filter(k => !budgets.some(b => b.kategoriId === k.id)).map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.icon} {k.namaKategori}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-xs'>Nominal Anggaran</Label>
              <Input type='number' value={addNominal} onChange={e => setAddNominal(e.target.value)} placeholder='0' className='mt-1' />
            </div>
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setAddOpen(false)}>Batal</Button>
            <Button 
              onClick={addBudget} 
              disabled={submitting || !addKategoriId || !addNominal}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====== MEMO VIEW ======
function MemoView() {
  const { setLainnyaView, currentUser, refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const [memos, setMemos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editMemo, setEditMemo] = useState<any>(null)
  const [formJudul, setFormJudul] = useState('')
  const [formIsi, setFormIsi] = useState('')
  const [formTag, setFormTag] = useState('')
  const [formPinned, setFormPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/memo')
      if (!res.ok) throw new Error('Failed to fetch memos')
      const data = await res.json()
      setMemos(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Error loading memos:', e)
      toast({ title: 'Gagal memuat memo', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData, refreshKey])

  const openAdd = () => {
    setFormJudul(''); setFormIsi(''); setFormTag(''); setFormPinned(false)
    setEditMemo(null); setAddOpen(true)
  }

  const openEdit = (m: any) => {
    setFormJudul(m.judul || ''); setFormIsi(m.isi || ''); setFormTag(m.tag || ''); setFormPinned(m.pinned || false)
    setEditMemo(m); setAddOpen(true)
  }

  const saveMemo = async () => {
    if (!formJudul.trim()) {
      toast({ title: 'Judul memo harus diisi', variant: 'destructive' })
      return
    }
    
    setSubmitting(true)
    try {
      const payload = { 
        judul: formJudul, 
        isi: formIsi, 
        tag: formTag, 
        pinned: formPinned 
      }
      
      let res: Response
      if (editMemo) {
        res = await fetch(`/api/memo/${editMemo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/memo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, dibuatOleh: currentUser || 'system@dompetkami.com' }),
        })
      }
      
      if (!res.ok) throw new Error('Failed to save memo')
      
      toast({ title: editMemo ? 'Memo diperbarui' : 'Memo ditambahkan' })
      setAddOpen(false)
      triggerRefresh()
    } catch (e) {
      console.error('Error saving memo:', e)
      toast({ title: 'Gagal menyimpan memo', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteMemo = async (id: string) => {
    try {
      const res = await fetch(`/api/memo/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete memo')
      toast({ title: 'Memo dihapus' })
      triggerRefresh()
    } catch (e) {
      console.error('Error deleting memo:', e)
      toast({ title: 'Gagal menghapus memo', variant: 'destructive' })
    }
  }

  const togglePin = async (m: any) => {
    try {
      const res = await fetch(`/api/memo/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...m, pinned: !m.pinned }),
      })
      if (!res.ok) throw new Error('Failed to toggle pin')
      triggerRefresh()
    } catch (e) {
      console.error('Error toggling pin:', e)
      toast({ title: 'Gagal mengubah pin', variant: 'destructive' })
    }
  }

  const tagColors: Record<string, string> = {
    utang: 'bg-red-100 text-red-600',
    ide: 'bg-amber-100 text-amber-600',
    rencana: 'bg-blue-100 text-blue-600',
  }

  return (
    <div className='flex flex-col h-[calc(100vh-2rem)] md:h-screen'>
      <div className='px-4 pt-2 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <button onClick={() => setLainnyaView(null)} className='p-1 hover:bg-gray-100 rounded-lg' aria-label='Kembali'>
              <ChevronLeft className='w-4 h-4 text-gray-600' />
            </button>
            <span className='text-base font-bold text-gray-900'>Memo</span>
            <span className='text-[10px] text-gray-400'>({memos.length})</span>
          </div>
          <button onClick={openAdd} className='text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1'>
            <Plus className='w-3 h-3' />Baru
          </button>
        </div>
      </div>

      <ScrollArea className='flex-1 pb-24 md:pb-8'>
        <div className='p-4 space-y-3 tab-content'>
          {loading ? (
            <div className='space-y-2'>
              <Skeleton className='h-16 rounded-xl' />
              <Skeleton className='h-16 rounded-xl' />
            </div>
          ) : memos.length === 0 ? (
            <div className='text-center py-16 text-gray-400 text-sm'>Belum ada memo</div>
          ) : (
            memos.map(m => (
              <Card key={m.id} className='border-0 shadow-sm rounded-xl'>
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1 min-w-0 cursor-pointer' onClick={() => openEdit(m)}>
                      <div className='flex items-center gap-2 mb-1'>
                        {m.pinned && <Pin className='w-3 h-3 text-amber-500 fill-amber-500' />}
                        <p className='text-xs font-semibold text-gray-800 truncate'>{m.judul}</p>
                      </div>
                      {m.isi && <p className='text-[11px] text-gray-500 line-clamp-2'>{m.isi}</p>}
                      <div className='flex items-center gap-2 mt-2'>
                        {m.tag && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${tagColors[m.tag] || 'bg-gray-100 text-gray-600'}`}>
                            {m.tag}
                          </span>
                        )}
                        <span className='text-[9px] text-gray-400'>{formatDate(m.createdAt)}</span>
                      </div>
                    </div>
                    <div className='flex flex-col gap-1 ml-2'>
                      <button 
                        onClick={() => togglePin(m)} 
                        className='p-1 hover:bg-gray-100 rounded'
                        aria-label={m.pinned ? 'Lepas pin' : 'Pin memo'}
                      >
                        <Pin className={`w-3 h-3 ${m.pinned ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                      </button>
                      <button 
                        onClick={() => deleteMemo(m.id)} 
                        className='p-1 hover:bg-gray-100 rounded'
                        aria-label='Hapus memo'
                      >
                        <Trash2 className='w-3 h-3 text-gray-400' />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open)
        if (!open) setEditMemo(null)
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editMemo ? 'Edit Memo' : 'Memo Baru'}</DialogTitle></DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label className='text-xs'>Judul *</Label>
              <Input 
                value={formJudul} 
                onChange={e => setFormJudul(e.target.value)} 
                className='mt-1' 
                placeholder='Judul memo' 
                autoFocus
              />
            </div>
            <div>
              <Label className='text-xs'>Isi</Label>
              <Textarea 
                value={formIsi} 
                onChange={e => setFormIsi(e.target.value)} 
                className='mt-1' 
                placeholder='Tulis catatan...' 
                rows={3} 
              />
            </div>
            <div className='flex gap-3'>
              <div className='flex-1'>
                <Label className='text-xs'>Tag</Label>
                <Input 
                  value={formTag} 
                  onChange={e => setFormTag(e.target.value)} 
                  className='mt-1' 
                  placeholder='utang, ide, rencana' 
                />
              </div>
              <div className='flex items-end pb-1'>
                <button 
                  onClick={() => setFormPinned(!formPinned)} 
                  className={`p-2 rounded-lg transition-colors ${formPinned ? 'bg-amber-50 text-amber-500' : 'bg-gray-50 text-gray-400'}`}
                  aria-label={formPinned ? 'Lepas pin' : 'Pin memo'}
                  aria-pressed={formPinned}
                >
                  <Pin className={`w-4 h-4 ${formPinned ? 'fill-amber-500' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setAddOpen(false)}>Batal</Button>
            <Button 
              onClick={saveMemo} 
              disabled={submitting || !formJudul.trim()}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====== SETTINGS VIEW ======
function SettingsView() {
  const { setLainnyaView, currentUser, setCurrentUser } = useAppStore()
  const { toast } = useToast()

  const handleUserSwitch = (email: string) => {
    setCurrentUser(email)
    toast({ title: `Beralih ke ${email === 'suami@dompetkami.com' ? 'Suami' : 'Istri'}` })
  }

  return (
    <div className='flex flex-col h-[calc(100vh-2rem)] md:h-screen'>
      <div className='px-4 pt-2 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10'>
        <div className='flex items-center gap-2'>
          <button onClick={() => setLainnyaView(null)} className='p-1 hover:bg-gray-100 rounded-lg' aria-label='Kembali'>
            <ChevronLeft className='w-4 h-4 text-gray-600' />
          </button>
          <span className='text-base font-bold text-gray-900'>Pengaturan</span>
        </div>
      </div>

      <ScrollArea className='flex-1 pb-24 md:pb-8'>
        <div className='p-4 space-y-4 tab-content'>
          <Card className='border-0 shadow-sm rounded-2xl'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-gray-700 mb-3'>Akun Aktif</p>
              <div className='space-y-2'>
                {[
                  { email: 'suami@dompetkami.com', nama: 'Suami', color: '#2563EB' },
                  { email: 'istri@dompetkami.com', nama: 'Istri', color: '#EC4899' },
                ].map(u => (
                  <button
                    key={u.email}
                    onClick={() => handleUserSwitch(u.email)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      currentUser === u.email ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    aria-label={`Beralih ke akun ${u.nama}`}
                    aria-pressed={currentUser === u.email}
                  >
                    <div className='w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold' style={{ backgroundColor: u.color }}>
                      {u.nama[0]}
                    </div>
                    <div className='text-left'>
                      <p className='text-xs font-semibold text-gray-800'>{u.nama}</p>
                      <p className='text-[10px] text-gray-400'>{u.email}</p>
                    </div>
                    {currentUser === u.email && <div className='ml-auto w-2 h-2 rounded-full bg-blue-600' />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-sm rounded-2xl'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-gray-700 mb-3'>Tentang</p>
              <div className='space-y-2 text-[11px] text-gray-500'>
                <div className='flex justify-between'><span>Versi</span><span className='font-medium'>1.0.0</span></div>
                <div className='flex justify-between'><span>Database</span><span className='font-medium'>SQLite</span></div>
                <div className='flex justify-between'><span>AI Engine</span><span className='font-medium'>z-ai-web-dev-sdk</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
