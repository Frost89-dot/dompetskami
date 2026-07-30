import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ==================== PUT - Bulk Update Bookmark ====================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { ids, isBookmark } = body
    
    // Validasi ids
    if (!ids) {
      return NextResponse.json(
        { error: 'IDs transaksi diperlukan' }, 
        { status: 400 }
      )
    }
    
    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'IDs harus berupa array' }, 
        { status: 400 }
      )
    }
    
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Minimal satu ID transaksi diperlukan' }, 
        { status: 400 }
      )
    }
    
    if (ids.length > 100) {
      return NextResponse.json(
        { error: 'Maksimal 100 transaksi per request' }, 
        { status: 400 }
      )
    }
    
    // Validasi setiap ID
    const invalidIds = ids.filter(id => typeof id !== 'string' || !id.trim())
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Format ID transaksi tidak valid' }, 
        { status: 400 }
      )
    }
    
    // Validasi isBookmark
    if (isBookmark === undefined) {
      return NextResponse.json(
        { error: 'Nilai isBookmark diperlukan' }, 
        { status: 400 }
      )
    }
    
    if (typeof isBookmark !== 'boolean') {
      return NextResponse.json(
        { error: 'isBookmark harus berupa boolean (true/false)' }, 
        { status: 400 }
      )
    }
    
    // Cek transaksi yang exists
    const existingTransactions = await db.transaksi.findMany({
      where: { id: { in: ids } },
      select: { 
        id: true, 
        isBookmark: true,
        deskripsi: true,
      }
    })
    
    const existingIds = existingTransactions.map(t => t.id)
    const notFoundIds = ids.filter(id => !existingIds.includes(id))
    
    if (existingIds.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada transaksi yang ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Cek transaksi yang sudah memiliki status yang sama
    const alreadySet = existingTransactions.filter(t => t.isBookmark === isBookmark)
    const needUpdate = existingTransactions.filter(t => t.isBookmark !== isBookmark)
    
    if (needUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: isBookmark 
          ? 'Semua transaksi sudah di-bookmark' 
          : 'Semua transaksi sudah tidak di-bookmark',
        data: {
          total: ids.length,
          updated: 0,
          skipped: existingIds.length,
          notFound: notFoundIds.length,
          alreadySet: alreadySet.length,
        }
      })
    }
    
    // Gunakan transaction untuk atomic operation
    const result = await db.$transaction(async (tx) => {
      // Update transaksi yang perlu diubah
      const updateResult = await tx.transaksi.updateMany({
        where: { 
          id: { in: needUpdate.map(t => t.id) },
        },
        data: { isBookmark },
      })
      
      // Get updated transactions untuk response
      const updatedTransactions = await tx.transaksi.findMany({
        where: { id: { in: needUpdate.map(t => t.id) } },
        select: {
          id: true,
          deskripsi: true,
          isBookmark: true,
          tanggalWaktu: true,
        }
      })
      
      return {
        updateResult,
        updatedTransactions,
      }
    })
    
    // Build response message
    const action = isBookmark ? 'di-bookmark' : 'dihapus bookmark-nya'
    let message = ''
    
    if (notFoundIds.length > 0 && result.updateResult.count > 0) {
      message = `${result.updateResult.count} transaksi berhasil ${action}. ${notFoundIds.length} transaksi tidak ditemukan.`
    } else if (notFoundIds.length > 0) {
      message = `Gagal: ${notFoundIds.length} transaksi tidak ditemukan.`
    } else {
      message = `${result.updateResult.count} transaksi berhasil ${action}.`
    }
    
    return NextResponse.json({ 
      success: true,
      message,
      data: {
        total: ids.length,
        updated: result.updateResult.count,
        skipped: alreadySet.length,
        notFound: notFoundIds.length,
        alreadySet: alreadySet.length,
        updatedTransactions: result.updatedTransactions,
        notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
      }
    })
    
  } catch (error) {
    console.error('Bulk update bookmark error:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Beberapa transaksi tidak ditemukan' }, 
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal mengupdate bookmark' }, 
      { status: 500 }
    )
  }
}

// ==================== PATCH - Toggle Bookmark ====================
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { ids, action } = body
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs transaksi diperlukan' }, 
        { status: 400 }
      )
    }
    
    if (ids.length > 100) {
      return NextResponse.json(
        { error: 'Maksimal 100 transaksi per request' }, 
        { status: 400 }
      )
    }
    
    // Toggle: bookmark jadi unbookmark, unbookmark jadi bookmark
    if (action === 'toggle') {
      const transactions = await db.transaksi.findMany({
        where: { id: { in: ids } },
        select: { id: true, isBookmark: true }
      })
      
      // Pisahkan berdasarkan status bookmark
      const toBookmark = transactions.filter(t => !t.isBookmark).map(t => t.id)
      const toUnbookmark = transactions.filter(t => t.isBookmark).map(t => t.id)
      
      const results = await db.$transaction([
        toBookmark.length > 0 
          ? db.transaksi.updateMany({
              where: { id: { in: toBookmark } },
              data: { isBookmark: true },
            })
          : Promise.resolve({ count: 0 }),
        
        toUnbookmark.length > 0
          ? db.transaksi.updateMany({
              where: { id: { in: toUnbookmark } },
              data: { isBookmark: false },
            })
          : Promise.resolve({ count: 0 }),
      ])
      
      return NextResponse.json({
        success: true,
        message: `${results[0].count} di-bookmark, ${results[1].count} dihapus bookmark-nya`,
        data: {
          bookmarked: results[0].count,
          unbookmarked: results[1].count,
          total: results[0].count + results[1].count,
        }
      })
    }
    
    return NextResponse.json(
      { error: 'Action tidak valid. Gunakan: toggle' }, 
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Bulk toggle bookmark error:', error)
    return NextResponse.json(
      { error: 'Gagal toggle bookmark' }, 
      { status: 500 }
    )
  }
}

// ==================== GET - Get Bookmark Status ====================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ids = searchParams.get('ids')
    
    if (!ids) {
      return NextResponse.json(
        { error: 'Parameter ids diperlukan' }, 
        { status: 400 }
      )
    }
    
    const idArray = ids.split(',').filter(Boolean)
    
    if (idArray.length === 0) {
      return NextResponse.json(
        { error: 'Minimal satu ID diperlukan' }, 
        { status: 400 }
      )
    }
    
    const transactions = await db.transaksi.findMany({
      where: { id: { in: idArray } },
      select: {
        id: true,
        isBookmark: true,
        deskripsi: true,
      }
    })
    
    const bookmarkStatus = transactions.reduce((acc, tx) => {
      acc[tx.id] = tx.isBookmark
      return acc
    }, {} as Record<string, boolean>)
    
    return NextResponse.json({
      success: true,
      data: {
        status: bookmarkStatus,
        total: transactions.length,
        bookmarked: transactions.filter(t => t.isBookmark).length,
        notBookmarked: transactions.filter(t => !t.isBookmark).length,
      }
    })
    
  } catch (error) {
    console.error('Error getting bookmark status:', error)
    return NextResponse.json(
      { error: 'Gagal mendapatkan status bookmark' }, 
      { status: 500 }
    )
  }
}
