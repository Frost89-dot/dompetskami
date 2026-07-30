import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Valid status
const VALID_STATUSES = ['Aktif', 'Tercapai', 'Dibatalkan'] as const
type TargetStatus = typeof VALID_STATUSES[number]

const isValidStatus = (status: string): status is TargetStatus => {
  return VALID_STATUSES.includes(status as TargetStatus)
}

// ==================== GET - Single Target ====================
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID target diperlukan' }, 
        { status: 400 }
      )
    }
    
    const target = await db.target.findUnique({
      where: { id },
      include: { 
        aset: {
          select: {
            id: true,
            namaAset: true,
            icon: true,
            saldoBerjalan: true,
          }
        } 
      },
    })
    
    if (!target) {
      return NextResponse.json(
        { error: 'Target tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Hitung progress
    const progress = target.nominalTarget > 0 
      ? Math.round((target.nominalTerkumpul / target.nominalTarget) * 100)
      : 0
    
    return NextResponse.json({ 
      success: true,
      data: {
        ...target,
        progress,
        sisa: Math.max(0, target.nominalTarget - target.nominalTerkumpul),
      }
    })
    
  } catch (error) {
    console.error('Error fetching target:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data target' }, 
      { status: 500 }
    )
  }
}

// ==================== PUT - Update Target ====================
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { namaTarget, nominalTarget, nominalTerkumpul, status, tanggalTarget, asetId } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID target diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Cek target exists
    const existingTarget = await db.target.findUnique({ 
      where: { id },
      select: { 
        id: true,
        namaTarget: true,
        nominalTarget: true,
        nominalTerkumpul: true,
        status: true,
      }
    })
    
    if (!existingTarget) {
      return NextResponse.json(
        { error: 'Target tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Validasi nama target
    if (namaTarget !== undefined) {
      if (typeof namaTarget !== 'string' || !namaTarget.trim()) {
        return NextResponse.json(
          { error: 'Nama target tidak boleh kosong' }, 
          { status: 400 }
        )
      }
      
      if (namaTarget.trim().length < 3 || namaTarget.trim().length > 100) {
        return NextResponse.json(
          { error: 'Nama target harus antara 3-100 karakter' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi nominal target
    if (nominalTarget !== undefined) {
      if (typeof nominalTarget !== 'number' || nominalTarget <= 0) {
        return NextResponse.json(
          { error: 'Nominal target harus berupa angka positif' }, 
          { status: 400 }
        )
      }
      
      if (nominalTarget > 1000000000000) { // 1 triliun
        return NextResponse.json(
          { error: 'Nominal target terlalu besar' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi nominal terkumpul
    if (nominalTerkumpul !== undefined) {
      if (typeof nominalTerkumpul !== 'number' || nominalTerkumpul < 0) {
        return NextResponse.json(
          { error: 'Nominal terkumpul tidak boleh negatif' }, 
          { status: 400 }
        )
      }
      
      const targetNominal = nominalTarget || existingTarget.nominalTarget
      if (nominalTerkumpul > targetNominal) {
        return NextResponse.json(
          { error: 'Nominal terkumpul tidak boleh melebihi target' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi status
    if (status !== undefined) {
      if (!isValidStatus(status)) {
        return NextResponse.json(
          { error: `Status tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}` }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi tanggal target
    if (tanggalTarget !== undefined) {
      const tanggal = new Date(tanggalTarget)
      if (isNaN(tanggal.getTime())) {
        return NextResponse.json(
          { error: 'Format tanggal tidak valid' }, 
          { status: 400 }
        )
      }
      
      if (tanggal < new Date(new Date().setHours(0, 0, 0, 0))) {
        return NextResponse.json(
          { error: 'Tanggal target tidak boleh di masa lalu' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi asetId
    if (asetId !== undefined) {
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
    
    // Build update data
    const updateData: any = {}
    if (namaTarget !== undefined) updateData.namaTarget = namaTarget.trim()
    if (nominalTarget !== undefined) updateData.nominalTarget = nominalTarget
    if (nominalTerkumpul !== undefined) updateData.nominalTerkumpul = nominalTerkumpul
    if (status !== undefined) updateData.status = status
    if (tanggalTarget !== undefined) updateData.tanggalTarget = new Date(tanggalTarget)
    if (asetId !== undefined) updateData.asetId = asetId
    
    // Auto-set status if target tercapai
    const finalNominal = nominalTarget || existingTarget.nominalTarget
    const finalTerkumpul = nominalTerkumpul !== undefined ? nominalTerkumpul : existingTarget.nominalTerkumpul
    
    if (finalTerkumpul >= finalNominal && status !== 'Dibatalkan') {
      updateData.status = 'Tercapai'
    }
    
    // Update target
    const target = await db.target.update({
      where: { id },
      data: updateData,
      include: { 
        aset: {
          select: {
            id: true,
            namaAset: true,
            icon: true,
          }
        } 
      },
    })
    
    // Hitung progress
    const progress = target.nominalTarget > 0 
      ? Math.round((target.nominalTerkumpul / target.nominalTarget) * 100)
      : 0
    
    return NextResponse.json({ 
      success: true,
      data: {
        ...target,
        progress,
        sisa: Math.max(0, target.nominalTarget - target.nominalTerkumpul),
      },
      message: 'Target berhasil diperbarui' 
    })
    
  } catch (error) {
    console.error('Error updating target:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Target tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal memperbarui target' }, 
      { status: 500 }
    )
  }
}

// ==================== PATCH - Update Progres Only ====================
export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, nominal } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID target diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Cek target exists
    const existingTarget = await db.target.findUnique({ 
      where: { id },
      select: { 
        id: true,
        nominalTarget: true,
        nominalTerkumpul: true,
        status: true,
        namaTarget: true,
      }
    })
    
    if (!existingTarget) {
      return NextResponse.json(
        { error: 'Target tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    if (existingTarget.status !== 'Aktif') {
      return NextResponse.json(
        { error: `Tidak dapat update progres pada target dengan status "${existingTarget.status}"` }, 
        { status: 400 }
      )
    }
    
    // Tambah nominal terkumpul
    if (action === 'add_progress') {
      if (!nominal || typeof nominal !== 'number' || nominal <= 0) {
        return NextResponse.json(
          { error: 'Nominal harus berupa angka positif' }, 
          { status: 400 }
        )
      }
      
      const newTerkumpul = existingTarget.nominalTerkumpul + nominal
      
      if (newTerkumpul > existingTarget.nominalTarget) {
        return NextResponse.json(
          { error: `Penambahan melebihi target. Maksimal penambahan: ${existingTarget.nominalTarget - existingTarget.nominalTerkumpul}` }, 
          { status: 400 }
        )
      }
      
      const isCompleted = newTerkumpul >= existingTarget.nominalTarget
      
      const target = await db.target.update({
        where: { id },
        data: {
          nominalTerkumpul: newTerkumpul,
          ...(isCompleted && { status: 'Tercapai' }),
        },
        include: { aset: true },
      })
      
      const progress = Math.round((newTerkumpul / existingTarget.nominalTarget) * 100)
      
      return NextResponse.json({
        success: true,
        data: target,
        progress,
        message: isCompleted 
          ? `🎉 Selamat! Target "${existingTarget.namaTarget}" tercapai!` 
          : `Progres bertambah ${nominal}. Progress: ${progress}%`,
        isCompleted,
      })
    }
    
    // Reset progres
    if (action === 'reset_progress') {
      const target = await db.target.update({
        where: { id },
        data: {
          nominalTerkumpul: 0,
          status: 'Aktif',
        },
        include: { aset: true },
      })
      
      return NextResponse.json({
        success: true,
        data: target,
        message: 'Progres target direset',
      })
    }
    
    return NextResponse.json(
      { error: 'Action tidak valid. Gunakan: add_progress, reset_progress' }, 
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error patching target:', error)
    return NextResponse.json(
      { error: 'Gagal mengupdate progres target' }, 
      { status: 500 }
    )
  }
}

// ==================== DELETE - Hapus Target ====================
export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID target diperlukan' }, 
        { status: 400 }
      )
    }
    
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'hard' // 'hard' atau 'soft'
    
    // Cek target exists
    const existingTarget = await db.target.findUnique({ 
      where: { id },
      select: { 
        id: true,
        namaTarget: true,
        status: true,
        nominalTarget: true,
        nominalTerkumpul: true,
      }
    })
    
    if (!existingTarget) {
      return NextResponse.json(
        { error: 'Target tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Warning jika target belum tercapai
    if (existingTarget.status === 'Aktif' && existingTarget.nominalTerkumpul > 0) {
      return NextResponse.json({
        success: false,
        error: 'Target masih aktif dengan progres. Yakin ingin menghapus?',
        data: {
          target: existingTarget,
          warning: `Progres sudah ${Math.round((existingTarget.nominalTerkumpul / existingTarget.nominalTarget) * 100)}%`,
        }
      }, { status: 409 })
    }
    
    let deletedTarget
    
    if (mode === 'soft') {
      // Soft delete: update status menjadi Dibatalkan
      deletedTarget = await db.target.update({
        where: { id },
        data: { status: 'Dibatalkan' },
        select: {
          id: true,
          namaTarget: true,
          status: true,
        }
      })
    } else {
      // Hard delete: hapus permanen
      deletedTarget = await db.target.delete({ 
        where: { id },
        select: {
          id: true,
          namaTarget: true,
          status: true,
        }
      })
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Target "${existingTarget.namaTarget}" berhasil ${mode === 'soft' ? 'dibatalkan' : 'dihapus'}`,
      data: deletedTarget,
    })
    
  } catch (error) {
    console.error('Error deleting target:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Target tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal menghapus target' }, 
      { status: 500 }
    )
  }
}
