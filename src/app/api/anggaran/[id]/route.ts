import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validasi ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID anggaran tidak valid' }, 
        { status: 400 }
      )
    }
    
    const body = await req.json()
    const { nominalAnggaran, status } = body
    
    // Validasi input
    if (nominalAnggaran !== undefined && (typeof nominalAnggaran !== 'number' || nominalAnggaran < 0)) {
      return NextResponse.json(
        { error: 'Nominal anggaran harus berupa angka positif' }, 
        { status: 400 }
      )
    }
    
    if (status !== undefined && !['active', 'inactive', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status anggaran tidak valid' }, 
        { status: 400 }
      )
    }
    
    // Update anggaran
    const budget = await db.anggaran.update({
      where: { id },
      data: { 
        ...(nominalAnggaran !== undefined && { nominalAnggaran }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      },
      include: { 
        kategori: {
          select: {
            id: true,
            namaKategori: true,
            icon: true,
          }
        } 
      },
    })
    
    return NextResponse.json({ 
      success: true, 
      data: budget,
      message: 'Anggaran berhasil diperbarui' 
    })
    
  } catch (error) {
    console.error('Error updating budget:', error)
    
    // Handle Prisma specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Anggaran tidak ditemukan' }, 
          { status: 404 }
        )
      }
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Data anggaran sudah ada' }, 
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal memperbarui anggaran' }, 
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
    
    // Validasi ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID anggaran tidak valid' }, 
        { status: 400 }
      )
    }
    
    // Cek apakah anggaran exists
    const existingBudget = await db.anggaran.findUnique({
      where: { id },
      select: { id: true }
    })
    
    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Anggaran tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Hapus anggaran
    await db.anggaran.delete({ where: { id } })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Anggaran berhasil dihapus' 
    })
    
  } catch (error) {
    console.error('Error deleting budget:', error)
    
    // Handle Prisma specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Anggaran tidak ditemukan' }, 
          { status: 404 }
        )
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Anggaran tidak dapat dihapus karena masih memiliki data terkait' }, 
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal menghapus anggaran' }, 
      { status: 500 }
    )
  }
}
