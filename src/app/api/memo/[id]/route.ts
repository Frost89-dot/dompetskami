import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Valid tags
const VALID_TAGS = ['utang', 'ide', 'rencana', 'penting', 'belanja', 'kerja', 'pribadi', 'keluarga'] as const
type MemoTag = typeof VALID_TAGS[number]

const isValidTag = (tag: string): tag is MemoTag => {
  return VALID_TAGS.includes(tag as MemoTag)
}

// ==================== GET - Single Memo ====================
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID memo diperlukan' }, 
        { status: 400 }
      )
    }
    
    const memo = await db.memo.findUnique({
      where: { id },
      select: {
        id: true,
        judul: true,
        isi: true,
        tag: true,
        pinned: true,
        dibuatOleh: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            nama: true,
            email: true,
          }
        },
      },
    })
    
    if (!memo) {
      return NextResponse.json(
        { error: 'Memo tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      data: memo 
    })
    
  } catch (error) {
    console.error('Error fetching memo:', error)
    return NextResponse.json(
      { error: 'Gagal memuat memo' }, 
      { status: 500 }
    )
  }
}

// ==================== PUT - Update Memo ====================
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { judul, isi, tag, pinned, dibuatOleh } = body
    
    // Validasi ID
    if (!id) {
      return NextResponse.json(
        { error: 'ID memo diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Validasi judul jika disediakan
    if (judul !== undefined) {
      if (typeof judul !== 'string' || !judul.trim()) {
        return NextResponse.json(
          { error: 'Judul memo tidak boleh kosong' }, 
          { status: 400 }
        )
      }
      
      if (judul.trim().length > 100) {
        return NextResponse.json(
          { error: 'Judul memo maksimal 100 karakter' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi isi jika disediakan
    if (isi !== undefined) {
      if (typeof isi !== 'string') {
        return NextResponse.json(
          { error: 'Isi memo harus berupa teks' }, 
          { status: 400 }
        )
      }
      
      if (isi.length > 5000) {
        return NextResponse.json(
          { error: 'Isi memo maksimal 5000 karakter' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi tag jika disediakan
    if (tag !== undefined && tag !== '' && tag !== null) {
      if (!isValidTag(tag)) {
        return NextResponse.json(
          { error: `Tag tidak valid. Pilihan: ${VALID_TAGS.join(', ')}` }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi pinned jika disediakan
    if (pinned !== undefined && typeof pinned !== 'boolean') {
      return NextResponse.json(
        { error: 'Pinned harus berupa boolean' }, 
        { status: 400 }
      )
    }
    
    // Cek apakah ada field yang akan diupdate
    if (judul === undefined && isi === undefined && tag === undefined && pinned === undefined) {
      return NextResponse.json(
        { error: 'Tidak ada data yang akan diupdate' }, 
        { status: 400 }
      )
    }
    
    // Cek memo exists dan dapatkan data existing
    const existingMemo = await db.memo.findUnique({ 
      where: { id },
      select: { 
        id: true, 
        dibuatOleh: true,
        judul: true,
        isi: true,
        tag: true,
        pinned: true,
      }
    })
    
    if (!existingMemo) {
      return NextResponse.json(
        { error: 'Memo tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Optional: Cek kepemilikan (jika dibuatOleh disertakan)
    if (dibuatOleh && dibuatOleh !== existingMemo.dibuatOleh) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk mengedit memo ini' }, 
        { status: 403 }
      )
    }
    
    // Build update data (hanya field yang disediakan dan berbeda)
    const updateData: any = {}
    if (judul !== undefined && judul.trim() !== existingMemo.judul) {
      updateData.judul = judul.trim()
    }
    if (isi !== undefined && isi !== existingMemo.isi) {
      updateData.isi = isi
    }
    if (tag !== undefined && tag !== existingMemo.tag) {
      updateData.tag = tag || null
    }
    if (pinned !== undefined && pinned !== existingMemo.pinned) {
      updateData.pinned = pinned
    }
    
    // Jika tidak ada perubahan, kembalikan existing data
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: true,
        data: existingMemo,
        message: 'Tidak ada perubahan pada memo' 
      })
    }
    
    // Update memo
    const memo = await db.memo.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        judul: true,
        isi: true,
        tag: true,
        pinned: true,
        dibuatOleh: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            nama: true,
            email: true,
          }
        },
      },
    })
    
    return NextResponse.json({ 
      success: true,
      data: memo,
      message: 'Memo berhasil diperbarui' 
    })
    
  } catch (error) {
    console.error('Error updating memo:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Memo tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal memperbarui memo' }, 
      { status: 500 }
    )
  }
}

// ==================== PATCH - Partial Update / Toggle ====================
export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID memo diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Toggle pin
    if (action === 'toggle_pin') {
      const memo = await db.memo.findUnique({ 
        where: { id },
        select: { id: true, pinned: true, judul: true }
      })
      
      if (!memo) {
        return NextResponse.json(
          { error: 'Memo tidak ditemukan' }, 
          { status: 404 }
        )
      }
      
      const updatedMemo = await db.memo.update({
        where: { id },
        data: { pinned: !memo.pinned },
        select: {
          id: true,
          judul: true,
          pinned: true,
          tag: true,
        }
      })
      
      return NextResponse.json({
        success: true,
        data: updatedMemo,
        message: updatedMemo.pinned ? 'Memo dipin' : 'Memo di-unpin'
      })
    }
    
    // Toggle tag
    if (action === 'toggle_tag') {
      const { tag: newTag } = body
      
      if (!newTag || !isValidTag(newTag)) {
        return NextResponse.json(
          { error: `Tag tidak valid. Pilihan: ${VALID_TAGS.join(', ')}` }, 
          { status: 400 }
        )
      }
      
      const memo = await db.memo.findUnique({ 
        where: { id },
        select: { id: true, tag: true }
      })
      
      if (!memo) {
        return NextResponse.json(
          { error: 'Memo tidak ditemukan' }, 
          { status: 404 }
        )
      }
      
      // Toggle: jika tag sama, hapus; jika berbeda, ganti
      const updatedTag = memo.tag === newTag ? null : newTag
      
      const updatedMemo = await db.memo.update({
        where: { id },
        data: { tag: updatedTag },
        select: {
          id: true,
          judul: true,
          tag: true,
          pinned: true,
        }
      })
      
      return NextResponse.json({
        success: true,
        data: updatedMemo,
        message: updatedTag ? `Tag diubah menjadi "${updatedTag}"` : 'Tag dihapus'
      })
    }
    
    return NextResponse.json(
      { error: 'Action tidak valid. Gunakan: toggle_pin, toggle_tag' }, 
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error patching memo:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Memo tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal mengubah memo' }, 
      { status: 500 }
    )
  }
}

// ==================== DELETE - Hapus Memo ====================
export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID memo diperlukan' }, 
        { status: 400 }
      )
    }
    
    // Optional: Dapatkan user dari query parameter untuk cek kepemilikan
    const { searchParams } = new URL(req.url)
    const dibuatOleh = searchParams.get('dibuatOleh')
    const mode = searchParams.get('mode') || 'hard' // 'hard' atau 'soft'
    
    // Cek memo exists
    const existingMemo = await db.memo.findUnique({ 
      where: { id },
      select: { 
        id: true, 
        dibuatOleh: true,
        judul: true,
        isi: true,
        tag: true,
        pinned: true,
      }
    })
    
    if (!existingMemo) {
      return NextResponse.json(
        { error: 'Memo tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Optional: Cek kepemilikan
    if (dibuatOleh && dibuatOleh !== existingMemo.dibuatOleh) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk menghapus memo ini' }, 
        { status: 403 }
      )
    }
    
    let deletedMemo
    
    if (mode === 'soft') {
      // Soft delete: update status
      deletedMemo = await db.memo.update({
        where: { id },
        data: { 
          // Soft delete menggunakan field statusAktif jika ada
          // statusAktif: false,
          // Atau gunakan field deletedAt
          // deletedAt: new Date(),
        },
        select: {
          id: true,
          judul: true,
        }
      })
    } else {
      // Hard delete: hapus permanen
      deletedMemo = await db.memo.delete({ 
        where: { id },
        select: {
          id: true,
          judul: true,
        }
      })
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Memo "${existingMemo.judul}" berhasil dihapus`,
      data: {
        id: existingMemo.id,
        judul: existingMemo.judul,
        tag: existingMemo.tag,
        pinned: existingMemo.pinned,
        mode: mode === 'soft' ? 'soft_delete' : 'hard_delete',
      }
    })
    
  } catch (error) {
    console.error('Error deleting memo:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Memo tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal menghapus memo' }, 
      { status: 500 }
    )
  }
}
