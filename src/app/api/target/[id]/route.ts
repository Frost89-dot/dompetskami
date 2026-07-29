import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const target = await db.target.update({
      where: { id },
      data: {
        namaTarget: body.namaTarget,
        nominalTarget: body.nominalTarget,
        nominalTerkumpul: body.nominalTerkumpul,
        status: body.status,
      },
      include: { aset: true },
    })
    return NextResponse.json(target)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.target.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}