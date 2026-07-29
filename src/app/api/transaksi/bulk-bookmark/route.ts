import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest) {
  try {
    const { ids, isBookmark } = await req.json()
    await db.transaksi.updateMany({
      where: { id: { in: ids } },
      data: { isBookmark },
    })
    return NextResponse.json({ success: true, count: ids.length })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update bookmarks' }, { status: 500 })
  }
}
