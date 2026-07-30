import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Valid tags
const VALID_TAGS = ['utang', 'ide', 'rencana', 'penting', 'belanja', 'kerja', 'pribadi', 'keluarga'] as const

// ==================== GET - List Memos ====================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Filter parameters
    const search = searchParams.get('search')
    const tag = searchParams.get('tag')
    const pinned = searchParams.get('pinned')
    const dibuatOleh = searchParams.get('dibuatOleh')
    const sort = searchParams.get('sort') || 'newest' // newest, oldest, updated
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    
    // Build where clause
    const where: any = {}
    
    // Search by judul or isi
    if (search) {
      where.OR = [
        { judul: { contains: search, mode: 'insensitive' } },
        { isi: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    // Filter by tag
    if (tag) {
      if (tag === 'untagged') {
        where.tag = null
      } else if (VALID_TAGS.includes(tag as any)) {
        where.tag = tag
      }
    }
    
    // Filter by pinned
    if (pinned === 'true') where.pinned = true
    if (pinned === 'false') where.pinned = false
    
    // Filter by creator
    if (dibuatOleh) where.dibuatOleh = dibuatOleh
    
    // Build orderBy
    let orderBy: any[] = [{ pinned: 'desc' }]
    
    switch (sort) {
      case 'oldest':
        orderBy.push({ createdAt: 'asc' })
        break
      case 'updated':
        orderBy.push({ updatedAt: 'desc' })
        break
      case 'newest':
      default:
        orderBy.push({ createdAt: 'desc' })
        break
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit
    
    // Get total count for pagination
    const totalCount = await db.memo.count({ where })
    
    // Get memos
    const memos = await db.memo.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
    
    // Group by pinned status
    const pinnedMemos = memos.filter(m => m.pinned)
    const unpinnedMemos = memos.filter(m => !m.pinned)
    
    return NextResponse.json({ 
      success: true,
      data: memos,
      grouped: {
        pinned: pinnedMemos,
        unpinned: unpinnedMemos,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + memos.length < totalCount,
      },
      filters: {
        search: search || null,
        tag: tag || null,
        pinned: pinned || null,
        dibuatOleh: dibuatOleh || null,
        sort,
      }
    })
    
  } catch (error) {
    console.error('Error fetching memos:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data memo' }, 
      { status: 500 }
    )
  }
}

// ==================== POST - Create Memo ====================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { judul, isi, tag, pinned, dibuatOleh } = body
    
    // Validasi judul
    if (!judul || typeof judul !== 'string' || !judul.trim()) {
      return NextResponse.json(
        { error: 'Judul memo wajib diisi' }, 
        { status: 400 }
      )
    }
    
    const trimmedJudul = judul.trim()
    
    // Validasi panjang judul
    if (trimmedJudul.length < 2) {
      return NextResponse.json(
        { error: 'Judul memo minimal 2 karakter' }, 
        { status: 400 }
      )
    }
    
    if (trimmedJudul.length > 100) {
      return NextResponse.json(
        { error: 'Judul memo maksimal 100 karakter' }, 
        { status: 400 }
      )
    }
    
    // Validasi isi
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
    
    // Validasi tag
    if (tag !== undefined && tag !== '' && tag !== null) {
      if (!VALID_TAGS.includes(tag)) {
        return NextResponse.json(
          { error: `Tag tidak valid. Pilihan: ${VALID_TAGS.join(', ')}` }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi pinned
    if (pinned !== undefined && typeof pinned !== 'boolean') {
      return NextResponse.json(
        { error: 'Pinned harus berupa boolean' }, 
        { status: 400 }
      )
    }
    
    // Validasi dibuatOleh
    if (!dibuatOleh) {
      return NextResponse.json(
        { error: 'Pembuat memo harus diisi' }, 
        { status: 400 }
      )
    }
    
    // Optional: Cek user exists
    const user = await db.user.findUnique({
      where: { email: dibuatOleh },
      select: { id: true }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Cek duplikasi judul (opsional)
    const existingMemo = await db.memo.findFirst({
      where: { 
        judul: trimmedJudul,
        dibuatOleh: dibuatOleh,
        // Hanya cek memo yang dibuat dalam 1 menit terakhir (prevent double submit)
        createdAt: { gte: new Date(Date.now() - 60000) }
      }
    })
    
    if (existingMemo) {
      return NextResponse.json(
        { error: 'Memo dengan judul yang sama baru saja dibuat' }, 
        { status: 409 }
      )
    }
    
    // Buat memo baru
    const memo = await db.memo.create({
      data: {
        judul: trimmedJudul,
        isi: isi || '',
        tag: tag || null,
        pinned: pinned || false,
        dibuatOleh: dibuatOleh,
      },
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
      message: 'Memo berhasil dibuat' 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create memo error:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Memo dengan data tersebut sudah ada' }, 
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal membuat memo' }, 
      { status: 500 }
    )
  }
}

// ==================== DELETE - Bulk Delete (Optional) ====================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const dibuatOleh = searchParams.get('dibuatOleh')
    
    // Delete all memos by user
    if (action === 'delete_all' && dibuatOleh) {
      const result = await db.memo.deleteMany({
        where: { dibuatOleh }
      })
      
      return NextResponse.json({
        success: true,
        message: `${result.count} memo berhasil dihapus`,
        data: { deletedCount: result.count }
      })
    }
    
    // Clear all memos (admin only - hati-hati!)
    if (action === 'clear_all') {
      const result = await db.memo.deleteMany()
      
      return NextResponse.json({
        success: true,
        message: `${result.count} memo berhasil dihapus`,
        data: { deletedCount: result.count }
      })
    }
    
    return NextResponse.json(
      { error: 'Action tidak valid. Gunakan: ?action=delete_all&dibuatOleh=email atau ?action=clear_all' }, 
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Delete memos error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus memo' }, 
      { status: 500 }
    )
  }
}
