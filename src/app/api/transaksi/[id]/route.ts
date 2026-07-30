import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ==================== GET - Single Transaction ====================
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID transaksi diperlukan' }, 
        { status: 400 }
      )
    }
    
    const tx = await db.transaksi.findUnique({
      where: { id },
      include: { 
        aset: {
          select: {
            id: true,
            namaAset: true,
            icon: true,
          }
        }, 
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
        },
      },
    })
    
    if (!tx) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      data: tx 
    })
    
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data transaksi' }, 
      { status: 500 }
    )
  }
}

// ==================== PUT - Update Transaction ====================
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID transaksi diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Cek transaksi exists
    const existing = await db.transaksi.findUnique({ 
      where: { id },
      include: { aset: true }
    })
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Toggle bookmark only (simple update tanpa transaction)
    if (body.isBookmark !== undefined && Object.keys(body).length === 1) {
      if (typeof body.isBookmark !== 'boolean') {
        return NextResponse.json(
          { error: 'isBookmark harus berupa boolean' }, 
          { status: 400 }
        )
      }
      
      const tx = await db.transaksi.update({
        where: { id },
        data: { isBookmark: body.isBookmark },
        include: { 
          aset: {
            select: {
              id: true,
              namaAset: true,
              icon: true,
            }
          }, 
          kategori: {
            select: {
              id: true,
              namaKategori: true,
              icon: true,
            }
          }, 
          user: {
            select: {
              id: true,
              nama: true,
            }
          },
        },
      })
      
      return NextResponse.json({ 
        success: true,
        data: tx,
        message: tx.isBookmark ? 'Transaksi di-bookmark' : 'Bookmark dihapus'
      })
    }
    
    // Validasi input untuk update penuh
    const {
      tanggalWaktu,
      tipe,
      asetId,
      asetTujuanId,
      kategoriId,
      nominal,
      deskripsi,
      catatan,
      isBookmark,
    } = body
    
    // Validasi nominal
    if (nominal !== undefined) {
      if (typeof nominal !== 'number' || nominal <= 0) {
        return NextResponse.json(
          { error: 'Nominal harus berupa angka positif' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi tipe
    const finalTipe = tipe || existing.tipe
    if (finalTipe && !['Pemasukan', 'Pengeluaran', 'Transfer'].includes(finalTipe)) {
      return NextResponse.json(
        { error: 'Tipe transaksi tidak valid (Pemasukan, Pengeluaran, Transfer)' }, 
        { status: 400 }
      )
    }
    
    // Validasi aset
    if (asetId) {
      const aset = await db.aset.findUnique({ 
        where: { id: asetId },
        select: { id: true, statusAktif: true }
      })
      
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
    }
    
    // Validasi aset tujuan untuk transfer
    const finalAsetTujuanId = asetTujuanId || existing.asetTujuanId
    if (finalTipe === 'Transfer') {
      if (!finalAsetTujuanId) {
        return NextResponse.json(
          { error: 'Aset tujuan wajib diisi untuk transfer' }, 
          { status: 400 }
        )
      }
      
      if (finalAsetTujuanId === (asetId || existing.asetId)) {
        return NextResponse.json(
          { error: 'Aset sumber dan tujuan tidak boleh sama' }, 
          { status: 400 }
        )
      }
      
      const asetTujuan = await db.aset.findUnique({ 
        where: { id: finalAsetTujuanId },
        select: { id: true, statusAktif: true }
      })
      
      if (!asetTujuan) {
        return NextResponse.json(
          { error: 'Aset tujuan tidak ditemukan' }, 
          { status: 404 }
        )
      }
      
      if (!asetTujuan.statusAktif) {
        return NextResponse.json(
          { error: 'Aset tujuan sudah tidak aktif' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi deskripsi
    if (deskripsi !== undefined && (!deskripsi || typeof deskripsi !== 'string')) {
      return NextResponse.json(
        { error: 'Deskripsi tidak boleh kosong' }, 
        { status: 400 }
      )
    }
    
    // Validasi tanggal
    if (tanggalWaktu) {
      const date = new Date(tanggalWaktu)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Format tanggal tidak valid' }, 
          { status: 400 }
        )
      }
    }
    
    // Gunakan transaction untuk atomic operation
    const result = await db.$transaction(async (tx) => {
      const finalAsetId = asetId || existing.asetId
      const finalNominal = nominal || existing.nominal
      
      // Jika nominal atau tipe atau aset berubah, update saldo
      if (
        nominal !== undefined || 
        tipe !== undefined || 
        asetId !== undefined || 
        asetTujuanId !== undefined
      ) {
        // ===== REVERSE OLD TRANSACTION =====
        
        // Reverse old source aset
        if (!existing.isAdjustment) {
          if (existing.tipe === 'Pemasukan') {
            // Kurangi saldo (reverse pemasukan)
            await tx.aset.update({
              where: { id: existing.asetId },
              data: { saldoBerjalan: { decrement: existing.nominal } },
            })
          } else if (existing.tipe === 'Pengeluaran') {
            // Tambah saldo (reverse pengeluaran)
            await tx.aset.update({
              where: { id: existing.asetId },
              data: { saldoBerjalan: { increment: existing.nominal } },
            })
          } else if (existing.tipe === 'Transfer' && existing.asetTujuanId) {
            // Reverse transfer: kembalikan ke sumber, kurangi dari tujuan
            await tx.aset.update({
              where: { id: existing.asetId },
              data: { saldoBerjalan: { increment: existing.nominal } },
            })
            await tx.aset.update({
              where: { id: existing.asetTujuanId },
              data: { saldoBerjalan: { decrement: existing.nominal } },
            })
          }
        }
        
        // ===== APPLY NEW TRANSACTION =====
        
        // Apply new source aset
        if (finalTipe === 'Pemasukan') {
          await tx.aset.update({
            where: { id: finalAsetId },
            data: { saldoBerjalan: { increment: finalNominal } },
          })
        } else if (finalTipe === 'Pengeluaran') {
          await tx.aset.update({
            where: { id: finalAsetId },
            data: { saldoBerjalan: { decrement: finalNominal } },
          })
        } else if (finalTipe === 'Transfer') {
          // Transfer: kurangi sumber, tambah tujuan
          await tx.aset.update({
            where: { id: finalAsetId },
            data: { saldoBerjalan: { decrement: finalNominal } },
          })
          await tx.aset.update({
            where: { id: finalAsetTujuanId },
            data: { saldoBerjalan: { increment: finalNominal } },
          })
        }
      }
      
      // Update transaksi
      const updatedTx = await tx.transaksi.update({
        where: { id },
        data: {
          ...(tanggalWaktu && { tanggalWaktu: new Date(tanggalWaktu) }),
          ...(tipe && { tipe: finalTipe }),
          ...(asetId && { asetId: finalAsetId }),
          ...(asetTujuanId !== undefined && { asetTujuanId: finalAsetTujuanId || null }),
          ...(kategoriId !== undefined && { kategoriId: kategoriId || null }),
          ...(nominal && { nominal: finalNominal }),
          ...(deskripsi !== undefined && { deskripsi }),
          ...(catatan !== undefined && { catatan }),
          ...(isBookmark !== undefined && { isBookmark }),
        },
        include: { 
          aset: {
            select: {
              id: true,
              namaAset: true,
              icon: true,
              saldoBerjalan: true,
            }
          }, 
          kategori: {
            select: {
              id: true,
              namaKategori: true,
              icon: true,
            }
          }, 
          user: {
            select: {
              id: true,
              nama: true,
            }
          },
          asetTujuan: {
            select: {
              id: true,
              namaAset: true,
              icon: true,
              saldoBerjalan: true,
            }
          },
        },
      })
      
      return updatedTx
    })
    
    return NextResponse.json({ 
      success: true,
      data: result,
      message: 'Transaksi berhasil diperbarui',
      details: {
        note: 'Saldo aset telah disesuaikan secara otomatis',
        asetSaldo: result.aset.saldoBerjalan,
        ...(result.asetTujuan && { asetTujuanSaldo: result.asetTujuan.saldoBerjalan }),
      }
    })
    
  } catch (error) {
    console.error('Error updating transaction:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Transaksi tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal memperbarui transaksi. Saldo tidak berubah.' }, 
      { status: 500 }
    )
  }
}

// ==================== DELETE - Hapus Transaksi ====================
export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID transaksi diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Cek transaksi exists
    const existing = await db.transaksi.findUnique({ 
      where: { id },
      include: { 
        aset: {
          select: {
            id: true,
            namaAset: true,
            saldoBerjalan: true,
          }
        } 
      }
    })
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Gunakan transaction untuk atomic operation
    const result = await db.$transaction(async (tx) => {
      // Reverse saldo (kecuali adjustment)
      if (!existing.isAdjustment) {
        if (existing.tipe === 'Pemasukan') {
          // Kurangi saldo (reverse pemasukan)
          await tx.aset.update({
            where: { id: existing.asetId },
            data: { saldoBerjalan: { decrement: existing.nominal } },
          })
        } else if (existing.tipe === 'Pengeluaran') {
          // Tambah saldo (reverse pengeluaran)
          await tx.aset.update({
            where: { id: existing.asetId },
            data: { saldoBerjalan: { increment: existing.nominal } },
          })
        } else if (existing.tipe === 'Transfer' && existing.asetTujuanId) {
          // Reverse transfer: kembalikan ke sumber, kurangi dari tujuan
          await tx.aset.update({
            where: { id: existing.asetId },
            data: { saldoBerjalan: { increment: existing.nominal } },
          })
          await tx.aset.update({
            where: { id: existing.asetTujuanId },
            data: { saldoBerjalan: { decrement: existing.nominal } },
          })
        }
      }
      
      // Hapus transaksi
      await tx.transaksi.delete({ where: { id } })
      
      return {
        deletedTransaction: {
          id: existing.id,
          deskripsi: existing.deskripsi,
          tipe: existing.tipe,
          nominal: existing.nominal,
        },
        affectedAset: {
          id: existing.aset.id,
          nama: existing.aset.namaAset,
          previousSaldo: existing.aset.saldoBerjalan,
        }
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Transaksi berhasil dihapus dan saldo dikembalikan',
      data: result,
    })
    
  } catch (error) {
    console.error('Error deleting transaction:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Transaksi tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal menghapus transaksi. Saldo tidak berubah.' }, 
      { status: 500 }
    )
  }
}
