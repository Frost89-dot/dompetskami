import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const periode = searchParams.get('periode') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const budgets = await db.anggaran.findMany({
      where: { periode },
      include: { kategori: true },
    })
    return NextResponse.json(budgets)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const existing = await db.anggaran.findFirst({
      where: { periode: body.periode, kategoriId: body.kategoriId },
    })
    let budget
    if (existing) {
      budget = await db.anggaran.update({
        where: { id: existing.id },
        data: { nominalAnggaran: body.nominalAnggaran },
        include: { kategori: true },
      })
    } else {
      budget = await db.anggaran.create({
        data: {
          periode: body.periode,
          kategoriId: body.kategoriId,
          nominalAnggaran: body.nominalAnggaran,
          dibuatOleh: body.dibuatOleh,
        },
        include: { kategori: true },
      })
    }
    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
