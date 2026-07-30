import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper untuk validasi periode
const getMonthRange = (bulan: string) => {
  const [year, month] = bulan.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) {
    throw new Error('Format periode tidak valid (YYYY-MM)')
  }
  
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)
  
  return { startDate, endDate }
}

const getYearRange = (year: number) => {
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999)
  
  return { startDate, endDate }
}

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID aset diperlukan' }, 
        { status: 400 }
      )
    }
    
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'daily'
    const bulan = searchParams.get('bulan') || 
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    
    // Validasi view parameter
    if (!['daily', 'monthly', 'yearly'].includes(view)) {
      return NextResponse.json(
        { error: 'View tidak valid (daily, monthly, yearly)' }, 
        { status: 400 }
      )
    }
    
    // Cek aset exists
    const aset = await db.aset.findUnique({ 
      where: { id },
      select: {
        id: true,
        namaAset: true,
        jenisGrup: true,
        pemilik: true,
        visibilitas: true,
        icon: true,
        saldoBerjalan: true,
        saldoAwal: true,
        statusAktif: true,
      }
    })
    
    if (!aset) {
      return NextResponse.json(
        { error: 'Aset tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Cek status aset
    if (!aset.statusAktif) {
      return NextResponse.json(
        { error: 'Aset sudah tidak aktif' }, 
        { status: 410 }
      )
    }
    
    // Tentukan range tanggal
    let startDate: Date, endDate: Date
    
    if (view === 'yearly') {
      const year = parseInt(bulan.split('-')[0])
      if (isNaN(year)) {
        return NextResponse.json(
          { error: 'Tahun tidak valid' }, 
          { status: 400 }
        )
      }
      ({ startDate, endDate } = getYearRange(year))
    } else {
      try {
        ({ startDate, endDate } = getMonthRange(bulan))
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message }, 
          { status: 400 }
        )
      }
    }
    
    // Get transactions
    const transactions = await db.transaksi.findMany({
      where: { 
        asetId: id, 
        tanggalWaktu: { gte: startDate, lte: endDate },
        // Exclude soft-deleted transactions jika ada
        // deletedAt: null,
      },
      orderBy: { tanggalWaktu: 'desc' },
      include: { 
        kategori: {
          select: {
            id: true,
            namaKategori: true,
            icon: true,
            warna: true,
          }
        },
        user: {
          select: {
            id: true,
            nama: true,
            email: true,
          }
        },
        asetTujuan: {
          select: {
            id: true,
            namaAset: true,
            icon: true,
          }
        }
      },
    })
    
    // Hitung total
    const totalIn = transactions
      .filter(t => t.tipe === 'Pemasukan' && !t.isAdjustment)
      .reduce((s, t) => s + t.nominal, 0)
    
    const totalOut = transactions
      .filter(t => t.tipe === 'Pengeluaran' && !t.isAdjustment)
      .reduce((s, t) => s + t.nominal, 0)
    
    const totalAdjustment = transactions
      .filter(t => t.isAdjustment)
      .reduce((s, t) => s + (t.tipe === 'Pemasukan' ? t.nominal : -t.nominal), 0)
    
    return NextResponse.json({ 
      success: true,
      data: {
        aset,
        transactions,
        summary: {
          totalIn,
          totalOut,
          totalAdjustment,
          netFlow: totalIn - totalOut + totalAdjustment,
          transactionCount: transactions.length,
        },
        view,
        periode: bulan,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching asset detail:', error)
    return NextResponse.json(
      { error: 'Gagal memuat detail aset' }, 
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID aset diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Validasi input
    const { namaAset, jenisGrup, pemilik, visibilitas, icon, statusAktif } = body
    
    if (namaAset !== undefined && (!namaAset || typeof namaAset !== 'string')) {
      return NextResponse.json(
        { error: 'Nama aset tidak valid' }, 
        { status: 400 }
      )
    }
    
    if (jenisGrup !== undefined && !['Kas', 'Akun', 'Tabungan', 'Kartu Kredit', 'Top-up/Prabayar', 'Investasi', 'Pinjaman', 'Asuransi'].includes(jenisGrup)) {
      return NextResponse.json(
        { error: 'Jenis grup tidak valid' }, 
        { status: 400 }
      )
    }
    
    if (pemilik !== undefined && !['Bersama', 'Suami', 'Istri'].includes(pemilik)) {
      return NextResponse.json(
        { error: 'Pemilik tidak valid' }, 
        { status: 400 }
      )
    }
    
    if (visibilitas !== undefined && !['Bersama', 'Privat'].includes(visibilitas)) {
      return NextResponse.json(
        { error: 'Visibilitas tidak valid' }, 
        { status: 400 }
      )
    }
    
    // Cek aset exists
    const existingAset = await db.aset.findUnique({ where: { id } })
    if (!existingAset) {
      return NextResponse.json(
        { error: 'Aset tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Cek duplikasi nama (jika nama diubah)
    if (namaAset && namaAset !== existingAset.namaAset) {
      const duplicate = await db.aset.findFirst({
        where: { 
          namaAset,
          id: { not: id },
          statusAktif: true,
        }
      })
      
      if (duplicate) {
        return NextResponse.json(
          { error: 'Nama aset sudah digunakan' }, 
          { status: 409 }
        )
      }
    }
    
    // Update aset
    const aset = await db.aset.update({
      where: { id },
      data: {
        ...(namaAset !== undefined && { namaAset }),
        ...(jenisGrup !== undefined && { jenisGrup }),
        ...(pemilik !== undefined && { pemilik }),
        ...(visibilitas !== undefined && { visibilitas }),
        ...(icon !== undefined && { icon }),
        ...(statusAktif !== undefined && { statusAktif }),
      },
    })
    
    return NextResponse.json({ 
      success: true, 
      data: aset,
      message: 'Aset berhasil diperbarui' 
    })
    
  } catch (error) {
    console.error('Error updating asset:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Aset tidak ditemukan' }, 
          { status: 404 }
        )
      }
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Data aset sudah ada' }, 
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal memperbarui aset' }, 
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { saldoBaru, dicatatOleh } = body
    
    // Validasi input
    if (!id) {
      return NextResponse.json(
        { error: 'ID aset diperlukan' }, 
        { status: 400 }
      )
    }
    
    if (saldoBaru === undefined || typeof saldoBaru !== 'number') {
      return NextResponse.json(
        { error: 'Saldo baru harus berupa angka' }, 
        { status: 400 }
      )
    }
    
    if (saldoBaru < 0) {
      return NextResponse.json(
        { error: 'Saldo tidak boleh negatif' }, 
        { status: 400 }
      )
    }
    
    if (!dicatatOleh) {
      return NextResponse.json(
        { error: 'Pencatat diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Gunakan transaction untuk atomic operation
    const result = await db.$transaction(async (tx) => {
      // Lock aset untuk mencegah race condition
      const aset = await tx.aset.findUnique({ 
        where: { id },
        // PostgreSQL: gunakan SELECT FOR UPDATE
        // ...(process.env.DATABASE_URL?.startsWith('postgres') && { 
        //   // Prisma doesn't support FOR UPDATE directly
        // })
      })
      
      if (!aset) {
        throw new Error('Aset tidak ditemukan')
      }
      
      if (!aset.statusAktif) {
        throw new Error('Aset sudah tidak aktif')
      }
      
      const diff = saldoBaru - aset.saldoBerjalan
      
      // Cegah adjustment jika tidak ada perubahan
      if (diff === 0) {
        throw new Error('Saldo baru sama dengan saldo saat ini')
      }
      
      const tipe = diff >= 0 ? 'Pemasukan' : 'Pengeluaran'
      
      // Buat transaksi adjustment
      const adjustmentTx = await tx.transaksi.create({
        data: {
          tanggalWaktu: new Date(),
          tipe,
          asetId: id,
          nominal: Math.abs(diff),
          deskripsi: `Penyesuaian Saldo ${aset.namaAset}`,
          catatan: `Saldo diubah dari ${aset.saldoBerjalan.toLocaleString('id-ID')} menjadi ${saldoBaru.toLocaleString('id-ID')} (selisih: ${diff.toLocaleString('id-ID')})`,
          isAdjustment: true,
          statusReview: 'Terverifikasi',
          dicatatOleh,
        },
      })
      
      // Update saldo aset
      const updatedAset = await tx.aset.update({
        where: { id },
        data: { saldoBerjalan: saldoBaru },
      })
      
      return {
        aset: updatedAset,
        adjustment: {
          transaction: adjustmentTx,
          previousBalance: aset.saldoBerjalan,
          newBalance: saldoBaru,
          difference: diff,
        }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      data: result.aset,
      adjustment: result.adjustment,
      message: 'Saldo berhasil disesuaikan' 
    })
    
  } catch (error: any) {
    console.error('Adjustment error:', error)
    
    // Handle specific errors from transaction
    if (error.message === 'Aset tidak ditemukan') {
      return NextResponse.json(
        { error: 'Aset tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    if (error.message === 'Aset sudah tidak aktif') {
      return NextResponse.json(
        { error: 'Tidak dapat menyesuaikan saldo aset yang tidak aktif' }, 
        { status: 400 }
      )
    }
    
    if (error.message === 'Saldo baru sama dengan saldo saat ini') {
      return NextResponse.json(
        { error: 'Tidak ada perubahan saldo' }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Gagal menyesuaikan saldo' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID aset diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Cek aset exists dan status
    const aset = await db.aset.findUnique({ where: { id } })
    
    if (!aset) {
      return NextResponse.json(
        { error: 'Aset tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    if (!aset.statusAktif) {
      return NextResponse.json(
        { error: 'Aset sudah tidak aktif' }, 
        { status: 400 }
      )
    }
    
    // Cek apakah aset memiliki transaksi aktif
    const transactionCount = await db.transaksi.count({
      where: { asetId: id }
    })
    
    // Soft delete: set statusAktif to false
    const updatedAset = await db.aset.update({
      where: { id },
      data: { 
        statusAktif: false,
        // Optional: tambahkan timestamp
        // deactivatedAt: new Date(),
      },
    })
    
    return NextResponse.json({ 
      success: true,
      data: updatedAset,
      message: 'Aset berhasil dinonaktifkan',
      details: {
        transactionCount,
        warning: transactionCount > 0 ? 
          `Aset memiliki ${transactionCount} transaksi yang akan tetap tersimpan` : 
          undefined
      }
    })
    
  } catch (error) {
    console.error('Error deleting asset:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Aset tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal menghapus aset' }, 
      { status: 500 }
    )
  }
}
