'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Camera, Upload, Loader2, Check, Pencil, ArrowLeftRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function FabForm() {
  const { fabFormType, setFabFormType, currentUser, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  // Shared state for loading asets & kategories
  const [asets, setAsets] = useState<any[]>([])
  const [kategories, setKategories] = useState<any[]>([])

  // Manual form
  const [tipe, setTipe] = useState<'Pengeluaran' | 'Pemasukan'>('Pengeluaran')
  const [asetId, setAsetId] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [nominal, setNominal] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [catatan, setCatatan] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  // Scan form
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanStatus, setScanStatus] = useState<string | null>(null)

  // Transfer form
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferNominal, setTransferNominal] = useState('')
  const [transferDesc, setTransferDesc] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
  const [transferSubmitting, setTransferSubmitting] = useState(false)

  const resetAllForms = () => {
    setTipe('Pengeluaran')
    setKategoriId('')
    setNominal('')
    setDeskripsi('')
    setCatatan('')
    setTanggal(new Date().toISOString().split('T')[0])
    setScanResult(null)
    setScanStatus(null)
    setTransferFrom('')
    setTransferTo('')
    setTransferNominal('')
    setTransferDesc('')
    setTransferDate(new Date().toISOString().split('T')[0])
  }

  useEffect(() => {
    if (fabFormType) {
      resetAllForms()
      Promise.all([fetch('/api/aset'), fetch('/api/kategori')]).then(async ([aRes, kRes]) => {
        const aJson = await aRes.json()
        const kJson = await kRes.json()
        setAsets(aJson.all || [])
        setKategories(kJson.all || [])
        if (aJson.all?.length) setAsetId(aJson.all[0].id)
      })
    }
  }, [fabFormType])

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setFabFormType(null)
      resetAllForms()
    }
  }

  // Submit Manual
  const handleManualSubmit = async () => {
    if (!nominal || !asetId || !deskripsi) {
      toast({ title: 'Lengkapi semua field wajib', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggalWaktu: new Date(tanggal).toISOString(),
          tipe, asetId, kategoriId: kategoriId || null,
          nominal: parseFloat(nominal),
          deskripsi, catatan, dicatatOleh: currentUser,
        }),
      })
      if (res.ok) {
        toast({ title: 'Transaksi tersimpan' })
        setFabFormType(null)
        triggerRefresh()
      }
    } catch {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' })
    }
    setSubmitting(false)
  }

  // Submit Transfer
  const handleTransferSubmit = async () => {
    if (!transferNominal || !transferFrom || !transferTo || !transferDesc) {
      toast({ title: 'Lengkapi semua field wajib', variant: 'destructive' })
      return
    }
    if (transferFrom === transferTo) {
      toast({ title: 'Aset sumber dan tujuan tidak boleh sama', variant: 'destructive' })
      return
    }
    setTransferSubmitting(true)
    try {
      const res = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggalWaktu: new Date(transferDate).toISOString(),
          tipe: 'Transfer',
          asetId: transferFrom,
          asetTujuanId: transferTo,
          nominal: parseFloat(transferNominal),
          deskripsi: transferDesc,
          dicatatOleh: currentUser,
        }),
      })
      if (res.ok) {
        const fromName = asets.find(a => a.id === transferFrom)?.namaAset || ''
        const toName = asets.find(a => a.id === transferTo)?.namaAset || ''
        toast({ title: `Transfer ${fromName} → ${toName} berhasil` })
        setFabFormType(null)
        triggerRefresh()
      } else {
        toast({ title: 'Gagal melakukan transfer', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Gagal melakukan transfer', variant: 'destructive' })
    }
    setTransferSubmitting(false)
  }

  // Scan
  const handleScan = async (file: File) => {
    if (!file || !asetId) return
    setScanLoading(true)
    setScanStatus(null)
    setScanResult(null)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1]
        const res = await fetch('/api/ai/scan-struk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, dicatatOleh: currentUser, asetId }),
        })
        const json = await res.json()
        setScanResult(json.extracted)
        setScanStatus(json.status)
        if (json.status === 'auto_saved') {
          toast({ title: 'Struk terdeteksi & otomatis disimpan!' })
          setFabFormType(null)
          triggerRefresh()
        } else if (json.status === 'needs_review') {
          toast({ title: 'Perlu review', description: 'Silakan periksa data struk' })
          if (json.extracted) {
            setDeskripsi(json.extracted.namaToko || '')
            setNominal(String(json.extracted.total || ''))
            setCatatan(json.extracted.items?.map((i: any) => i.nama).join(', ') || '')
            if (json.extracted.tanggal) setTanggal(json.extracted.tanggal)
          }
        } else {
          toast({ title: 'Gagal membaca struk', variant: 'destructive' })
        }
      }
      reader.readAsDataURL(file)
    } catch {
      toast({ title: 'Gagal memproses gambar', variant: 'destructive' })
    }
    setScanLoading(false)
  }

  const filteredKategories = kategories.filter(k => k.tipe === tipe)
  const filteredTransferAsets = asets.filter(a => a.id !== transferFrom)

  // ==================== TRANSFER DIALOG ====================
  return (
    <Dialog open={fabFormType === 'transfer'} onOpenChange={handleFormClose}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ArrowLeftRight className='w-4 h-4 text-blue-600' />
            Transfer Antar Aset
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label className='text-xs'>Tanggal</Label>
              <Input type='date' value={transferDate} onChange={e => setTransferDate(e.target.value)} className='mt-1' />
            </div>
            <div>
              <Label className='text-xs'>Nominal (Rp)</Label>
              <Input type='number' value={transferNominal} onChange={e => setTransferNominal(e.target.value)} placeholder='0' className='mt-1 text-lg font-bold' />
            </div>
          </div>

          <div>
            <Label className='text-xs'>Dari Aset (Sumber) *</Label>
            <Select value={transferFrom} onValueChange={setTransferFrom}>
              <SelectTrigger className='mt-1'><SelectValue placeholder='Pilih aset sumber' /></SelectTrigger>
              <SelectContent>
                {asets.map(a => <SelectItem key={a.id} value={a.id}>{a.icon} {a.namaAset}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className='flex justify-center'>
            <div className='w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center'>
              <ArrowLeftRight className='w-4 h-4 text-blue-600' />
            </div>
          </div>

          <div>
            <Label className='text-xs'>Ke Aset (Tujuan) *</Label>
            <Select value={transferTo} onValueChange={setTransferTo}>
              <SelectTrigger className='mt-1'><SelectValue placeholder='Pilih aset tujuan' /></SelectTrigger>
              <SelectContent>
                {filteredTransferAsets.map(a => <SelectItem key={a.id} value={a.id}>{a.icon} {a.namaAset}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className='text-xs'>Keterangan *</Label>
            <Input value={transferDesc} onChange={e => setTransferDesc(e.target.value)} placeholder='Contoh: Top up dari BCA ke GoPay' className='mt-1' />
          </div>

          {transferFrom && transferTo && transferNominal && (
            <div className='bg-blue-50 rounded-xl p-3 text-xs text-blue-700'>
              <span className='font-medium'>Ringkasan:</span>{' '}
              {asets.find(a => a.id === transferFrom)?.icon}{' '}
              {asets.find(a => a.id === transferFrom)?.namaAset} →{' '}
              {asets.find(a => a.id === transferTo)?.icon}{' '}
              {asets.find(a => a.id === transferTo)?.namaAset}{' '}
              <span className='font-semibold'>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseFloat(transferNominal) || 0)}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='ghost' onClick={() => handleFormClose(false)}>Batal</Button>
          <Button onClick={handleTransferSubmit} disabled={transferSubmitting || !transferFrom || !transferTo || !transferNominal || !transferDesc} className='bg-blue-600 hover:bg-blue-700'>
            {transferSubmitting ? <Loader2 className='w-4 h-4 animate-spin mr-1' /> : <Check className='w-4 h-4 mr-1' />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ==================== SCAN DIALOG ====================
  if (fabFormType === 'scan') {
    return (
      <Dialog open={fabFormType === 'scan' && !scanStatus} onOpenChange={handleFormClose}>
        <DialogContent className='max-w-md max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Camera className='w-4 h-4' />
              Scan Struk AI
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='border-2 border-dashed border-gray-200 rounded-xl p-8 text-center'>
              <Camera className='w-10 h-10 text-gray-300 mx-auto mb-2' />
              <p className='text-sm text-gray-500'>Upload foto struk belanja</p>
              <p className='text-[10px] text-gray-400 mt-1'>AI akan otomatis mengekstrak data transaksi</p>
            </div>
            <input ref={fileRef} type='file' accept='image/*' capture='environment' className='hidden' onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])} />
            {scanLoading ? (
              <div className='flex items-center justify-center gap-2 py-4'>
                <Loader2 className='w-5 h-5 animate-spin text-blue-600' />
                <span className='text-sm text-gray-500'>Memproses struk...</span>
              </div>
            ) : (
              <Button onClick={() => fileRef.current?.click()} variant='outline' className='w-full' disabled={!asetId}>
                <Upload className='w-4 h-4 mr-2' />Pilih Foto Struk
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ==================== MANUAL DIALOG ====================
  return (
    <Dialog open={fabFormType === 'manual' || (fabFormType === 'scan' && scanStatus === 'needs_review')} onOpenChange={handleFormClose}>
      <DialogContent className='max-w-md max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {fabFormType === 'scan' ? <Camera className='w-4 h-4' /> : <Pencil className='w-4 h-4' />}
            {fabFormType === 'scan' ? 'Review Hasil Scan' : 'Input Manual'}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Scan result banner */}
          {scanResult && scanStatus === 'needs_review' && (
            <div className='bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2'>
              <div className='w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5'>
                <Camera className='w-3 h-3 text-amber-600' />
              </div>
              <div className='flex-1'>
                <p className='text-xs font-medium text-amber-800'>Hasil Scan AI</p>
                <p className='text-[10px] text-amber-600 mt-0.5'>Data diekstrak otomatis. Silakan periksa dan konfirmasi.</p>
                {scanResult.namaToko && <p className='text-[10px] text-amber-700 mt-1 font-medium'>Toko: {scanResult.namaToko}</p>}
              </div>
            </div>
          )}

          {/* Type toggle */}
          <div className='flex gap-2'>
            <Button
              onClick={() => { setTipe('Pengeluaran'); setKategoriId('') }}
              variant={tipe === 'Pengeluaran' ? 'default' : 'outline'}
              className={`flex-1 ${tipe === 'Pengeluaran' ? 'bg-red-500 hover:bg-red-600' : ''}`}
              size='sm'
            >Pengeluaran</Button>
            <Button
              onClick={() => { setTipe('Pemasukan'); setKategoriId('') }}
              variant={tipe === 'Pemasukan' ? 'default' : 'outline'}
              className={`flex-1 ${tipe === 'Pemasukan' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              size='sm'
            >Pemasukan</Button>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label className='text-xs'>Tanggal</Label>
              <Input type='date' value={tanggal} onChange={e => setTanggal(e.target.value)} className='mt-1' />
            </div>
            <div>
              <Label className='text-xs'>Aset/Rekening</Label>
              <Select value={asetId} onValueChange={setAsetId}>
                <SelectTrigger className='mt-1'><SelectValue placeholder='Pilih aset' /></SelectTrigger>
                <SelectContent>
                  {asets.map(a => <SelectItem key={a.id} value={a.id}>{a.icon} {a.namaAset}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className='text-xs'>Kategori</Label>
            <Select value={kategoriId} onValueChange={setKategoriId}>
              <SelectTrigger className='mt-1'><SelectValue placeholder='Pilih kategori' /></SelectTrigger>
              <SelectContent>
                {filteredKategories.map(k => <SelectItem key={k.id} value={k.id}>{k.icon} {k.namaKategori}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className='text-xs'>Nominal (Rp)</Label>
            <Input type='number' value={nominal} onChange={e => setNominal(e.target.value)} placeholder='0' className='mt-1 text-lg font-bold' />
          </div>

          <div>
            <Label className='text-xs'>Deskripsi *</Label>
            <Input value={deskripsi} onChange={e => setDeskripsi(e.target.value)} placeholder='Contoh: Belanja sayur di pasar' className='mt-1' />
          </div>

          <div>
            <Label className='text-xs'>Catatan (opsional)</Label>
            <Textarea value={catatan} onChange={e => setCatatan(e.target.value)} placeholder='Tambah catatan...' className='mt-1' rows={2} />
          </div>

          <div className='flex gap-2'>
            <Button variant='ghost' onClick={() => handleFormClose(false)} className='flex-1'>Batal</Button>
            <Button onClick={handleManualSubmit} disabled={submitting || !deskripsi || !nominal} className='flex-1 bg-blue-600 hover:bg-blue-700'>
              {submitting ? <Loader2 className='w-4 h-4 animate-spin mr-1' /> : <Check className='w-4 h-4 mr-1' />}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
