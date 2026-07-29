import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const kategories = await db.kategori.findMany({
      where: { parentKategoriId: null },
      include: { children: true },
      orderBy: { tipe: 'desc' },
    })
    const grouped: Record<string, typeof kategories> = {
      Pemasukan: kategories.filter(k => k.tipe === 'Pemasukan'),
      Pengeluaran: kategories.filter(k => k.tipe === 'Pengeluaran'),
    }
    return NextResponse.json({ all: kategories, grouped })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const cat = await db.kategori.create({ data: body })
    return NextResponse.json(cat, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}