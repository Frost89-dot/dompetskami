import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

const GRUP_ORDER = [
  'Kas', 
  'Akun', 
  'Tabungan', 
  'Kartu Kredit', 
  'Top-up/Prabayar', 
  'Investasi', 
  'Pinjaman', 
  'Asuransi'
] as const

type GrupType = typeof GRUP_ORDER[number]

// Helper untuk validasi grup
const isValidGrup = (grup: string): grup is GrupType => {
  return GRUP_ORDER.includes(grup as GrupType)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Optional filters
    const jenisGrup = searchParams.get('jenisGrup')
    const pemilik = searchParams.get('pemilik')
    const visibilitas = searchParams.get('visibilitas')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    // Build where clause
    const where: any = {}
    
    if (!includeInactive) {
      where.statusAktif = true
    }
    
    if (jenisGrup && isValidGrup(jenisGrup)) {
      where.jenisGrup = jenisGrup
    }
    
    if (pemilik && ['Bersama', 'Suami', 'Istri'].includes(pemilik)) {
      where.pemilik = pemilik
    }
    
    if (visibilitas && ['Bersama', 'Privat'].includes(visibilitas)) {
      where.visibilitas = visibilitas
    }
    
    const asets = await db.aset.findMany({
      where,
      orderBy: [
        { jenisGrup: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        namaAset: true,
        jenisGrup: true,
        pemilik: true,
        visibilitas: true,
        saldoAwal: true,
        saldoBerjalan: true,
        icon: true,
        mataUang: true,
        statusAktif: true,
        createdAt: true,
        updatedAt: true,
        // Hitung jumlah transaksi
        _count: {
          select: {
            transaksi: true,
          }
        }
      },
    })
    
    // Group asets by jenisGrup dengan urutan yang ditentukan
    const grouped = GRUP_ORDER.reduce((acc, grup) => {
      const items = asets.filter(a => a.jenisGrup === grup)
      if (items.length > 0) {
        acc[grup] = items
      }
      return acc
    }, {} as Record<string, typeof asets>)
    
    // Tambahkan grup yang tidak ada di GRUP_ORDER
    asets.forEach(aset => {
      if (!GRUP_ORDER.includes(aset.jenisGrup as GrupType) && !grouped[aset.jenisGrup]) {
        grouped[aset.jenisGrup] = asets.filter(a => a.jenisGrup === aset.jenisGrup)
      }
    })
    
    // Hitung summary
    const summary = {
      totalAset: asets.length,
      totalSaldo: asets.reduce((sum, a) => sum + a.saldoBerjalan, 0),
      totalGrup: Object.keys(grouped).length,
      asetAktif: asets.filter(a => a.statusAktif).length,
      asetNonaktif: asets.filter(a => !a.statusAktif).length,
    }
    
    return NextResponse.json({ 
      success: true,
      grouped, 
      all: asets,
      summary,
      filters: {
        jenisGrup: jenisGrup || null,
        pemilik: pemilik || null,
        visibilitas: visibilitas || null,
        includeInactive,
      }
    })
    
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data aset' }, 
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      namaAset, 
      jenisGrup, 
      pemilik = 'Bersama', 
      visibilitas = 'Bersama', 
      saldoAwal = 0, 
      icon = '💰', 
      mataUang = 'IDR' 
    } = body
    
    // Validasi required fields
    if (!namaAset || typeof namaAset !== 'string' || !namaAset.trim()) {
      return NextResponse.json(
        { error: 'Nama aset wajib diisi' }, 
        { status: 400 }
      )
    }
    
    if (!jenisGrup || !isValidGrup(jenisGrup)) {
      return NextResponse.json(
        { error: `Jenis grup tidak valid. Pilihan: ${GRUP_ORDER.join(', ')}` }, 
        { status: 400 }
      )
    }
    
    // Validasi nama aset (minimal 2 karakter, maksimal 50)
    const trimmedNama = namaAset.trim()
    if (trimmedNama.length < 2 || trimmedNama.length > 50) {
      return NextResponse.json(
        { error: 'Nama aset harus antara 2-50 karakter' }, 
        { status: 400 }
      )
    }
    
    // Validasi pemilik
    if (!['Bersama', 'Suami', 'Istri'].includes(pemilik)) {
      return NextResponse.json(
        { error: 'Pemilik tidak valid (Bersama, Suami, Istri)' }, 
        { status: 400 }
      )
    }
    
    // Validasi visibilitas
    if (!['Bersama', 'Privat'].includes(visibilitas)) {
      return NextResponse.json(
        { error: 'Visibilitas tidak valid (Bersama, Privat)' }, 
        { status: 400 }
      )
    }
    
    // Validasi saldo awal
    const parsedSaldoAwal = parseFloat(saldoAwal)
    if (isNaN(parsedSaldoAwal) || parsedSaldoAwal < 0) {
      return NextResponse.json(
        { error: 'Saldo awal harus berupa angka positif atau 0' }, 
        { status: 400 }
      )
    }
    
    // Validasi mata uang
    const validCurrencies = ['IDR', 'USD', 'SGD', 'MYR']
    if (mataUang && !validCurrencies.includes(mataUang)) {
      return NextResponse.json(
        { error: `Mata uang tidak valid. Pilihan: ${validCurrencies.join(', ')}` }, 
        { status: 400 }
      )
    }
    
    // Validasi icon (harus emoji tunggal)
    if (icon && (typeof icon !== 'string' || icon.length > 2)) {
      return NextResponse.json(
        { error: 'Icon harus berupa emoji tunggal' }, 
        { status: 400 }
      )
    }
    
    // Cek duplikasi nama aset
    const existingAset = await db.aset.findFirst({
      where: { 
        namaAset: trimmedNama,
        statusAktif: true,
      }
    })
    
    if (existingAset) {
      return NextResponse.json(
        { error: 'Nama aset sudah digunakan' }, 
        { status: 409 }
      )
    }
    
    // Buat aset baru
    const aset = await db.aset.create({
      data: {
        namaAset: trimmedNama,
        jenisGrup,
        pemilik,
        visibilitas,
        saldoAwal: parsedSaldoAwal,
        saldoBerjalan: parsedSaldoAwal,
        icon: icon || '💰',
        mataUang: mataUang || 'IDR',
        statusAktif: true,
      },
      select: {
        id: true,
        namaAset: true,
        jenisGrup: true,
        pemilik: true,
        visibilitas: true,
        saldoAwal: true,
        saldoBerjalan: true,
        icon: true,
        mataUang: true,
        statusAktif: true,
        createdAt: true,
      }
    })
    
    return NextResponse.json({ 
      success: true,
      data: aset,
      message: 'Aset berhasil dibuat' 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create aset error:', error)
    
    // Handle Prisma specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Nama aset sudah digunakan' }, 
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal membuat aset' }, 
      { status: 500 }
    )
  }
}
