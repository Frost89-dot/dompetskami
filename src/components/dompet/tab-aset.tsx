'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, Pencil, Plus, X, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { formatRupiah, formatDateShort, formatTime, getMonthName, changePeriode, OWNER_BG_COLORS, getPercentage } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'

const GRUP_ICONS: Record<string, string> = {
  'Kas': '💵', 'Akun': '🏦', 'Kartu Kredit': '💳',
  'Tabungan': '🐷', 'Top-up/Prabayar': '📱', 'Investasi': '📈',
  'Pinjaman': '📝', 'Asuransi': '🏥',
}

export function TabAset() {
  const { selectedAsetId, setSelectedAsetId, periode, setPeriode, refreshKey } = useAppStore()
  const { toast } = useToast()
  const [grouped, setGrouped] = useState<Record<string, any[]>>({})
  const [all, setAll] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailPeriode, setDetailPeriode] = useState(periode)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [newSaldo, setNewSaldo] = useState('')
  const [adjustLoading, setAdjustLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/aset')
      const json = await res.json()
      setGrouped(json.grouped || {})
      setAll(json.all || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { loadData() }, [loadData])

  const openDetail = async (id: string) => {
    setSelectedAsetId(id)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/aset/${id}?view=daily&bulan=${periode}`)
      const json = await res.json()
      setDetail(json)
      setDetailPeriode(periode)
    } catch (e) { console.error(e) }
    setDetailLoading(false)
  }

  const loadDetail = useCallback(async () => {
    if (!selectedAsetId) return
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/aset/${selectedAsetId}?view=daily&bulan=${detailPeriode}`)
      const json = await res.json()
      setDetail(json)
    } catch (e) { console.error(e) }
    setDetailLoading(false)
  }, [selectedAsetId, detailPeriode])

  useEffect(() => { if (selectedAsetId) loadDetail() }, [loadDetail])

  const handleAdjust = async () => {
    if (!selectedAsetId || !newSaldo) return
    setAdjustLoading(true)
    try {
      await fetch(`/api/aset/${selectedAsetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldoBaru: parseFloat(newSaldo), dicatatOleh: 'suami@dompetkami.com' }),
      })
      toast({ title: 'Saldo berhasil disesuaikan' })
      setAdjustOpen(false)
      setNewSaldo('')
      loadData()
      loadDetail()
    } catch (e) {
      toast({ title: 'Gagal menyesuaikan saldo', variant: 'destructive' })
    }
    setAdjustLoading(false)
  }

  const totalSaldo = all.reduce((s, a) => s + a.saldoBerjalan, 0)

  // Detail view
  if (selectedAsetId && detail) {
    return (
      <div className='flex flex-col h-[calc(100vh-8rem)]'>
        <div className='px-4 pt-2 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10'>
          <div className='flex items-center gap-2 mb-2'>
            <button onClick={() => setSelectedAsetId(null)} className='p-1 hover:bg-gray-100 rounded-lg'>
              <ChevronLeft className='w-4 h-4 text-gray-600' />
            </button>
            <span className='text-base font-bold text-gray-900'>{detail.aset.icon} {detail.aset.namaAset}</span>
          </div>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <button onClick={() => setDetailPeriode(changePeriode(detailPeriode, -1))} className='p-1 hover:bg-gray-100 rounded-lg'>
                <ChevronLeft className='w-3 h-3 text-gray-500' />
              </button>
              <span className='text-xs font-semibold text-gray-700'>{getMonthName(detailPeriode)}</span>
              <button onClick={() => setDetailPeriode(changePeriode(detailPeriode, 1))} className='p-1 hover:bg-gray-100 rounded-lg'>
                <ChevronLeft className='w-3 h-3 text-gray-500 rotate-180' />
              </button>
            </div>
            <button onClick={() => { setAdjustOpen(true); setNewSaldo(String(detail.aset.saldoBerjalan)) }} className='text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full'>
              <Pencil className='w-3 h-3 inline mr-1' />Edit Saldo
            </button>
          </div>
        </div>

        <ScrollArea className='flex-1 pb-24'>
          <div className='p-4 space-y-4 tab-content'>
            <Card className='border-0 shadow-sm rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white'>
              <CardContent className='p-4'>
                <p className='text-blue-100 text-[10px]'>Saldo Berjalan</p>
                <p className='text-xl font-bold mt-0.5'>{formatRupiah(detail.aset.saldoBerjalan)}</p>
                <div className='flex gap-4 mt-2'>
                  <div>
                    <p className='text-[9px] text-blue-200'>Masuk</p>
                    <p className='text-xs font-semibold text-emerald-300'>+{formatRupiah(detail.totalIn)}</p>
                  </div>
                  <div>
                    <p className='text-[9px] text-blue-200'>Keluar</p>
                    <p className='text-xs font-semibold text-red-300'>-{formatRupiah(detail.totalOut)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {detailLoading ? (
              <div className='space-y-2'>
                <Skeleton className='h-14 w-full rounded-xl' />
                <Skeleton className='h-14 w-full rounded-xl' />
                <Skeleton className='h-14 w-full rounded-xl' />
              </div>
            ) : (
              <Card className='border-0 shadow-sm rounded-xl overflow-hidden'>
                {detail.transactions.length === 0 ? (
                  <div className='py-12 text-center text-gray-400 text-sm'>Tidak ada transaksi</div>
                ) : (
                  detail.transactions.map((tx: any) => (
                    <div key={tx.id} className='flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0'>
                      <div className='w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm'>{tx.kategori?.icon || '📦'}</div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-medium text-gray-800 truncate'>{tx.deskripsi}</p>
                        <p className='text-[10px] text-gray-400'>{formatDateShort(tx.tanggalWaktu)} · {formatTime(tx.tanggalWaktu)}</p>
                      </div>
                      <span className={`text-xs font-semibold ${tx.tipe === 'Pemasukan' ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {tx.tipe === 'Pemasukan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                      </span>
                    </div>
                  ))
                )}
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Adjust Dialog */}
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Penyesuaian Saldo</DialogTitle>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label className='text-xs'>Saldo Saat Ini</Label>
                <p className='text-sm font-medium mt-0.5'>{formatRupiah(detail.aset.saldoBerjalan)}</p>
              </div>
              <div>
                <Label className='text-xs'>Saldo Baru</Label>
                <Input type='number' value={newSaldo} onChange={(e) => setNewSaldo(e.target.value)} className='mt-1' />
                {newSaldo && (
                  <p className={`text-[10px] mt-1 ${parseFloat(newSaldo) - detail.aset.saldoBerjalan >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    Selisih: {parseFloat(newSaldo) - detail.aset.saldoBerjalan >= 0 ? '+' : ''}{formatRupiah(parseFloat(newSaldo) - detail.aset.saldoBerjalan)}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant='ghost' onClick={() => setAdjustOpen(false)}>Batal</Button>
              <Button onClick={handleAdjust} disabled={adjustLoading} className='bg-blue-600 hover:bg-blue-700'>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Group view
  if (loading) {
    return (
      <div className='p-4 space-y-3'>
        <Skeleton className='h-8 w-full rounded-xl' />
        <Skeleton className='h-24 w-full rounded-2xl' />
        <Skeleton className='h-24 w-full rounded-2xl' />
      </div>
    )
  }

  return (
    <div className='flex flex-col h-[calc(100vh-8rem)]'>
      <div className='px-4 pt-2 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10'>
        <h2 className='text-base font-bold text-gray-900'>Aset & Rekening</h2>
        <p className='text-[10px] text-gray-400 mt-0.5'>{all.length} aset aktif · Total {formatRupiah(totalSaldo)}</p>
      </div>

      <ScrollArea className='flex-1 pb-24'>
        <div className='p-4 space-y-4 tab-content'>
          {Object.entries(grouped).map(([grup, items]) => {
            if (!items || items.length === 0) return null
            const grupTotal = items.reduce((s: number, a: any) => s + a.saldoBerjalan, 0)
            return (
              <Card key={grup} className='border-0 shadow-sm rounded-2xl overflow-hidden'>
                <div className='flex items-center justify-between px-4 py-2.5 bg-gray-50/80'>
                  <div className='flex items-center gap-2'>
                    <span className='text-base'>{GRUP_ICONS[grup] || '📦'}</span>
                    <span className='text-xs font-semibold text-gray-700'>{grup}</span>
                    <span className='text-[10px] text-gray-400'>({items.length})</span>
                  </div>
                  <span className='text-xs font-semibold text-gray-800'>{formatRupiah(grupTotal)}</span>
                </div>
                {items.map((aset: any) => (
                  <button
                    key={aset.id}
                    onClick={() => openDetail(aset.id)}
                    className='w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 text-left'
                  >
                    <div className='w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg'>{aset.icon}</div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-medium text-gray-800'>{aset.namaAset}</p>
                      <div className='flex items-center gap-1.5 mt-0.5'>
                        <span className='text-[10px] text-gray-400'>{aset.pemilik}</span>
                        {aset.visibilitas === 'Privat' && (
                          <span className='text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0 rounded-full'>Privat</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${aset.saldoBerjalan < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                      {formatRupiah(aset.saldoBerjalan)}
                    </span>
                  </button>
                ))}
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
