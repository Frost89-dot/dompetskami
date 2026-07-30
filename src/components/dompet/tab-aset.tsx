'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, Pencil, Plus, Wallet, Trash2, Settings2 } from 'lucide-react'
import { formatRupiah, formatDateShort, formatTime, getMonthName, changePeriode } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import { AlertAlertDialog } from './alert-dialog'

const GRUP_ICONS: Record<string, string> = {
  'Kas': '💵', 'Akun': '🏦', 'Kartu Kredit': '💳',
  'Tabungan': '🐷', 'Top-up/Prabayar': '📱', 'Investasi': '📈',
  'Pinjaman': '📝', 'Asuransi': '🏥',
}

const GRUP_OPTIONS = ['Kas', 'Akun', 'Tabungan', 'Kartu Kredit', 'Top-up/Prabayar', 'Investasi', 'Pinjaman', 'Asuransi']

const ICON_OPTIONS = ['💰', '🏦', '💳', '🐷', '📱', '📈', '💵', '📝', '🏥', '🏠', '🚗', '🛒', '✈️', '🎁', '💎', '🔄']

interface AsetFormData {
  namaAset: string
  jenisGrup: string
  pemilik: string
  visibilitas: string
  saldoAwal: string
  icon: string
}

const EMPTY_FORM: AsetFormData = {
  namaAset: '',
  jenisGrup: 'Kas',
  pemilik: 'Bersama',
  visibilitas: 'Bersama',
  saldoAwal: '0',
  icon: '💰',
}

export function TabAset() {
  const { selectedAsetId, setSelectedAsetId, periode, refreshKey, triggerRefresh } = useAppStore()
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

  // Create / Edit dialog
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingAsetId, setEditingAsetId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AsetFormData>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  const openCreate = () => {
    setFormMode('create')
    setEditingAsetId(null)
    setFormData(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (aset: any) => {
    setFormMode('edit')
    setEditingAsetId(aset.id)
    setFormData({
      namaAset: aset.namaAset,
      jenisGrup: aset.jenisGrup,
      pemilik: aset.pemilik,
      visibilitas: aset.visibilitas,
      saldoAwal: String(aset.saldoAwal),
      icon: aset.icon,
    })
    setFormOpen(true)
  }

  const handleFormSubmit = async () => {
    if (!formData.namaAset || !formData.jenisGrup) {
      toast({ title: 'Lengkapi nama aset dan grup', variant: 'destructive' })
      return
    }
    setFormLoading(true)
    try {
      if (formMode === 'create') {
        const res = await fetch('/api/aset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            saldoAwal: parseFloat(formData.saldoAwal) || 0,
          }),
        })
        if (res.ok) {
          toast({ title: 'Aset berhasil ditambahkan' })
          setFormOpen(false)
          loadData()
          triggerRefresh()
        } else {
          toast({ title: 'Gagal menambahkan aset', variant: 'destructive' })
        }
      } else if (editingAsetId) {
        const res = await fetch(`/api/aset/${editingAsetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          toast({ title: 'Aset berhasil diperbarui' })
          setFormOpen(false)
          setEditingAsetId(null)
          loadData()
          if (detail?.aset?.id === editingAsetId) loadDetail()
        } else {
          toast({ title: 'Gagal memperbarui aset', variant: 'destructive' })
        }
      }
    } catch (e) {
      toast({ title: 'Gagal menyimpan aset', variant: 'destructive' })
    }
    setFormLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/aset/${deleteId}`, { method: 'DELETE' })
      toast({ title: 'Aset dihapus' })
      setDeleteId(null)
      if (selectedAsetId === deleteId) setSelectedAsetId(null)
      loadData()
      triggerRefresh()
    } catch (e) {
      toast({ title: 'Gagal menghapus aset', variant: 'destructive' })
    }
  }

  const totalSaldo = all.reduce((s, a) => s + a.saldoBerjalan, 0)

  // Detail view
  if (selectedAsetId && detail) {
    return (
      <div className='flex flex-col h-[calc(100vh-2rem)] md:h-screen'>
        <div className='px-4 md:px-6 pt-4 md:pt-6 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <button onClick={() => { setSelectedAsetId(null); setDetail(null) }} className='p-2 hover:bg-gray-100 rounded-xl transition-colors'>
                <ChevronLeft className='w-5 h-5 text-gray-600' />
              </button>
              <span className='text-lg font-bold text-gray-900'>{detail.aset.icon} {detail.aset.namaAset}</span>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => openEdit(detail.aset)}
                className='flex items-center gap-1.5 text-xs text-gray-500 font-medium hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors'
              >
                <Settings2 className='w-3.5 h-3.5' />
                <span className='hidden sm:inline'>Edit</span>
              </button>
              <button onClick={() => setDeleteId(detail.aset.id)} className='flex items-center gap-1.5 text-xs text-red-500 font-medium hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors'>
                <Trash2 className='w-3.5 h-3.5' />
                <span className='hidden sm:inline'>Hapus</span>
              </button>
            </div>
          </div>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <button onClick={() => setDetailPeriode(changePeriode(detailPeriode, -1))} className='p-1.5 hover:bg-gray-100 rounded-lg transition-colors'>
                <ChevronLeft className='w-4 h-4 text-gray-500' />
              </button>
              <span className='text-sm font-semibold text-gray-700 min-w-[140px] text-center'>{getMonthName(detailPeriode)}</span>
              <button onClick={() => setDetailPeriode(changePeriode(detailPeriode, 1))} className='p-1.5 hover:bg-gray-100 rounded-lg transition-colors'>
                <ChevronLeft className='w-4 h-4 text-gray-500 rotate-180' />
              </button>
            </div>
            <button onClick={() => { setAdjustOpen(true); setNewSaldo(String(detail.aset.saldoBerjalan)) }} className='text-xs text-blue-600 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors'>
              <Pencil className='w-3.5 h-3.5 inline mr-1' />Edit Saldo
            </button>
          </div>
        </div>

        <ScrollArea className='flex-1 pb-24 md:pb-8'>
          <div className='p-4 md:p-6 space-y-4 tab-content'>
            <Card className='border-0 shadow-sm rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white'>
              <CardContent className='p-5 md:p-6'>
                <p className='text-blue-100 text-xs font-medium'>Saldo Berjalan</p>
                <p className='text-2xl md:text-3xl font-bold mt-1 tracking-tight'>{formatRupiah(detail.aset.saldoBerjalan)}</p>
                <div className='flex gap-6 mt-3'>
                  <div>
                    <p className='text-[10px] text-blue-200'>Masuk</p>
                    <p className='text-sm font-semibold text-emerald-300'>+{formatRupiah(detail.totalIn)}</p>
                  </div>
                  <div>
                    <p className='text-[10px] text-blue-200'>Keluar</p>
                    <p className='text-sm font-semibold text-red-300'>-{formatRupiah(detail.totalOut)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {detailLoading ? (
              <div className='space-y-2'>
                <Skeleton className='h-16 w-full rounded-xl' />
                <Skeleton className='h-16 w-full rounded-xl' />
                <Skeleton className='h-16 w-full rounded-xl' />
              </div>
            ) : (
              <Card className='border-0 shadow-sm rounded-xl overflow-hidden'>
                {detail.transactions.length === 0 ? (
                  <div className='py-16 text-center text-gray-400 text-sm'>Tidak ada transaksi bulan ini</div>
                ) : (
                  detail.transactions.map((tx: any) => (
                    <div key={tx.id} className='flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors'>
                      <div className='w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-base'>{tx.kategori?.icon || '📦'}</div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-800 truncate'>{tx.deskripsi}</p>
                        <p className='text-xs text-gray-400 mt-0.5'>{formatDateShort(tx.tanggalWaktu)} · {formatTime(tx.tanggalWaktu)}</p>
                      </div>
                      <span className={`text-sm font-semibold ${tx.tipe === 'Pemasukan' ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {tx.tipe === 'Pemasukan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                      </span>
                    </div>
                  ))
                )}
              </Card>
            )}
          </div>
        </ScrollArea>

        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent className='max-w-sm'>
            <DialogHeader>
              <DialogTitle>Penyesuaian Saldo</DialogTitle>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label className='text-xs'>Saldo Saat Ini</Label>
                <p className='text-sm font-medium mt-1'>{formatRupiah(detail.aset.saldoBerjalan)}</p>
              </div>
              <div>
                <Label className='text-xs'>Saldo Baru</Label>
                <Input type='number' value={newSaldo} onChange={(e) => setNewSaldo(e.target.value)} className='mt-1' />
                {newSaldo && (
                  <p className={`text-xs mt-1.5 ${parseFloat(newSaldo) - detail.aset.saldoBerjalan >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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

        <AlertAlertDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Hapus Aset"
          description="Aset akan dinonaktifkan. Transaksi terkait tetap tersimpan. Lanjutkan?"
        />
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className='p-4 md:p-6 space-y-4'>
        <Skeleton className='h-8 w-full rounded-xl' />
        <Skeleton className='h-28 w-full rounded-2xl' />
        <Skeleton className='h-28 w-full rounded-2xl' />
      </div>
    )
  }

  // Group view (main aset list)
  return (
    <div className='flex flex-col h-[calc(100vh-2rem)] md:h-screen'>
      <div className='px-4 md:px-6 pt-4 md:pt-6 pb-3 bg-white/80 backdrop-blur-md sticky top-0 z-10'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-bold text-gray-900'>Aset & Rekening</h2>
            <p className='text-xs text-gray-400 mt-0.5'>{all.length} aset aktif · Total {formatRupiah(totalSaldo)}</p>
          </div>
          <button
            onClick={openCreate}
            className='flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-sm transition-colors'
          >
            <Plus className='w-4 h-4' />
            <span className='hidden sm:inline'>Tambah Aset</span>
            <span className='sm:hidden'>Tambah</span>
          </button>
        </div>
      </div>

      <ScrollArea className='flex-1 pb-24 md:pb-8'>
        <div className='p-4 md:p-6 space-y-4 tab-content'>
          {Object.entries(grouped).map(([grup, items]) => {
            if (!items || items.length === 0) return null
            const grupTotal = items.reduce((s: number, a: any) => s + a.saldoBerjalan, 0)
            return (
              <Card key={grup} className='border-0 shadow-sm rounded-2xl overflow-hidden'>
                <div className='flex items-center justify-between px-4 md:px-5 py-3 bg-gray-50/80'>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>{GRUP_ICONS[grup] || '📦'}</span>
                    <span className='text-sm font-semibold text-gray-700'>{grup}</span>
                    <span className='text-xs text-gray-400'>({items.length})</span>
                  </div>
                  <span className='text-sm font-semibold text-gray-800'>{formatRupiah(grupTotal)}</span>
                </div>
                {items.map((aset: any) => (
                  <div key={aset.id} className='group flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0'>
                    <button
                      onClick={() => openDetail(aset.id)}
                      className='flex items-center gap-3 flex-1 min-w-0 text-left'
                    >
                      <div className='w-10 h-10 md:w-11 md:h-11 rounded-xl bg-blue-50 flex items-center justify-center text-lg md:text-xl flex-shrink-0'>{aset.icon}</div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-800'>{aset.namaAset}</p>
                        <div className='flex items-center gap-2 mt-0.5'>
                          <span className='text-xs text-gray-400'>{aset.pemilik}</span>
                          {aset.visibilitas === 'Privat' && (
                            <span className='text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0 rounded-full'>Privat</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ${aset.saldoBerjalan < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {formatRupiah(aset.saldoBerjalan)}
                      </span>
                    </button>
                    {/* Desktop action buttons */}
                    <div className='hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(aset) }}
                        className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
                        title='Edit aset'
                      >
                        <Pencil className='w-3.5 h-3.5 text-gray-400' />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(aset.id) }}
                        className='p-2 hover:bg-red-50 rounded-lg transition-colors'
                        title='Hapus aset'
                      >
                        <Trash2 className='w-3.5 h-3.5 text-gray-400 hover:text-red-500' />
                      </button>
                    </div>
                  </div>
                ))}
              </Card>
            )
          })}

          {all.length === 0 && (
            <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
              <div className='w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4'>
                <Wallet className='w-8 h-8 text-gray-300' />
              </div>
              <p className='text-sm font-medium'>Belum ada aset</p>
              <p className='text-xs text-gray-400 mt-1'>Tap tombol Tambah untuk menambahkan aset pertama</p>
              <button
                onClick={openCreate}
                className='mt-4 flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors'
              >
                <Plus className='w-4 h-4' />
                Tambah Aset
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Tambah Aset Baru' : 'Edit Aset'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label className='text-xs'>Icon</Label>
              <div className='flex flex-wrap gap-2 mt-1.5'>
                {ICON_OPTIONS.map(ic => (
                  <button
                    key={ic}
                    type='button'
                    onClick={() => setFormData(f => ({ ...f, icon: ic }))}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                      formData.icon === ic
                        ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className='text-xs'>Nama Aset *</Label>
              <Input
                value={formData.namaAset}
                onChange={e => setFormData(f => ({ ...f, namaAset: e.target.value }))}
                placeholder='Contoh: BCA, GoPay, Dompet'
                className='mt-1'
              />
            </div>

            <div>
              <Label className='text-xs'>Jenis Grup *</Label>
              <Select value={formData.jenisGrup} onValueChange={v => setFormData(f => ({ ...f, jenisGrup: v }))}>
                <SelectTrigger className='mt-1'><SelectValue placeholder='Pilih grup' /></SelectTrigger>
                <SelectContent>
                  {GRUP_OPTIONS.map(g => (
                    <SelectItem key={g} value={g}>{GRUP_ICONS[g] || '📦'} {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label className='text-xs'>Pemilik</Label>
                <Select value={formData.pemilik} onValueChange={v => setFormData(f => ({ ...f, pemilik: v }))}>
                  <SelectTrigger className='mt-1'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Bersama'>Bersama</SelectItem>
                    <SelectItem value='Suami'>Suami</SelectItem>
                    <SelectItem value='Istri'>Istri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs'>Visibilitas</Label>
                <Select value={formData.visibilitas} onValueChange={v => setFormData(f => ({ ...f, visibilitas: v }))}>
                  <SelectTrigger className='mt-1'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Bersama'>Bersama</SelectItem>
                    <SelectItem value='Privat'>Privat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formMode === 'create' && (
              <div>
                <Label className='text-xs'>Saldo Awal</Label>
                <Input
                  type='number'
                  value={formData.saldoAwal}
                  onChange={e => setFormData(f => ({ ...f, saldoAwal: e.target.value }))}
                  placeholder='0'
                  className='mt-1'
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setFormOpen(false)}>Batal</Button>
            <Button
              onClick={handleFormSubmit}
              disabled={formLoading || !formData.namaAset}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {formMode === 'create' ? 'Tambah' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertAlertDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Aset"
        description="Aset akan dinonaktifkan. Transaksi terkait tetap tersimpan. Lanjutkan?"
      />
    </div>
  )
}
