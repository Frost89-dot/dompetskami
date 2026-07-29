import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const targets = await db.target.findMany({
      include: { aset: true },
      orderBy: { tanggalTarget: 'asc' },
    })
    return NextResponse.json(targets)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const target = await db.target.create({
      data: {
        namaTarget: body.namaTarget,
        jenisTarget: body.jenisTarget || 'Tabungan',
        nominalTarget: body.nominalTarget,
        nominalTerkumpul: 0,
        asetTerkaitId: body.asetTerkaitId || null,
        tanggalMulai: new Date(body.tanggalMulai),
        tanggalTarget: new Date(body.tanggalTarget),
        pemilik: body.pemilik || 'Bersama',
        userId: body.userId,
      },
      include: { aset: true },
    })
    return NextResponse.json(target, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}