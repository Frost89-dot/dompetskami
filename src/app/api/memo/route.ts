import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const memos = await db.memo.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: { user: true },
    })
    return NextResponse.json(memos)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const memo = await db.memo.create({
      data: {
        judul: body.judul,
        isi: body.isi || '',
        tag: body.tag || '',
        pinned: body.pinned || false,
        dibuatOleh: body.dibuatOleh,
      },
      include: { user: true },
    })
    return NextResponse.json(memo, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}