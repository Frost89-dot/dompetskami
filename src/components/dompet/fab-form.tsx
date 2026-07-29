'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Camera, Upload, Loader2, Check, X, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function FabForm() {
  const { fabOpen, setFabOpen, fabMode, setFabMode, currentUser, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [asets, setAsets] = useState<any[]>([])
  const [kategories, setKategories] = useState<any[]>([])
  const [tipe, setTipe] = useState<'Pengeluaran' | 'Pemasukan'>('Pengeluaran')
  const [asetId, setAsetId] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [nominal, setNominal] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [catatan, setCatatan] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanStatus, setScanStatus] = useState<string | null>(null)

  const resetForm = () => {
    setTipe('Pengeluaran')
    setKategoriId('')
    setNominal('')
    setDeskripsi('')
    setCatatan('')
    setTanggal(new Date().toISOString().split('T')[0])
    setScanResult(null)
    setScanStatus(null)
  }

  useEffect(() => {
    if (fabOpen) {
      resetForm()
      Promise.all([fetch('/api/aset'), fetch('/api/kategori')]).then(async ([aRes, kRes]) => {
        const aJson = await aRes.json()
        const kJson = await kRes.json()
        setAsets(aJson.all || [])
        setKategories(kJson.all || [])
        if (aJson.all?.length) setAsetId(aJson.all[0].id)
      })
    }
  }, [fabOpen])

  const handleSubmit = async () => {
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
        setFabOpen(false)
        triggerRefresh()
      }
    } catch {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' })
    }
    setSubmitting(false)
  }

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
          setFabOpen(false)
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

  return (
    <Dialog open={fabOpen && (fabMode === 'manual' || (fabMode === 'scan' && !scanStatus))} onOpenChange={(v) => { if (!v) { setFabOpen(false); setScanResult(null); setScanStatus(null) } }}>
      <DialogContent className='max-w-md max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {fabMode === 'scan' ? <Camera className='w-4 h-4' /> : <Pencil className='w-4 h-4' />}
            {fabMode === 'scan' ? 'Scan Struk AI' : 'Input Manual'}
          </DialogTitle>
        </DialogHeader>

        {fabMode === 'scan' && !scanResult && (
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
        )}

        {(fabMode === 'manual' || (fabMode === 'scan' && scanResult)) && (
          <div className='space-y-4'>
            {/* Scan result banner */}
            {scanResult && scanStatus === 'needs_review' && (
              <div className='bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2'>
                <div className='w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <Camera className='w-3 h-3 text-amber-600' />
                </div>
                <div>
                  <p className='text-xs font-medium text-amber-800'>Hasil Scan AI</p>
                  <p className='text-[10px] text-amber-600 mt-0.5'>Data diekstrak otomatis. Silakan periksa dan konfirmasi.</p>
                  {scanResult.namaToko && <p className='text-[10px] text-amber-700 mt-1 font-medium'>Toko: {scanResult.namaToko}</p>}
                </div>
                <button onClick={() => { setScanResult(null); setScanStatus(null) }} className='p-1 hover:bg-amber-100 rounded ml-auto'>
                  <X className='w-3 h-3 text-amber-600' />
                </button>
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
              <Button variant='ghost' onClick={() => setFabOpen(false)} className='flex-1'>Batal</Button>
              <Button onClick={handleSubmit} disabled={submitting || !deskripsi || !nominal} className='flex-1 bg-blue-600 hover:bg-blue-700'>
                {submitting ? <Loader2 className='w-4 h-4 animate-spin mr-1' /> : <Check className='w-4 h-4 mr-1' />}
                Simpan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}