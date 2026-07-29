import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tx = await db.transaksi.findUnique({
      where: { id },
      include: { aset: true, kategori: true, user: true, asetTujuan: true },
    })
    if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(tx)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get transaction' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.transaksi.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.isBookmark !== undefined && Object.keys(body).length === 1) {
      const tx = await db.transaksi.update({
        where: { id },
        data: { isBookmark: body.isBookmark },
        include: { aset: true, kategori: true, user: true },
      })
      return NextResponse.json(tx)
    }

    if (body.nominal !== undefined && body.nominal !== existing.nominal) {
      const oldMul = existing.tipe === 'Pemasukan' ? 1 : -1
      await db.aset.update({
        where: { id: existing.asetId },
        data: { saldoBerjalan: { decrement: existing.nominal * oldMul } },
      })
      const newMul = (body.tipe || existing.tipe) === 'Pemasukan' ? 1 : -1
      await db.aset.update({
        where: { id: body.asetId || existing.asetId },
        data: { saldoBerjalan: { increment: body.nominal * newMul } },
      })
    }

    const tx = await db.transaksi.update({
      where: { id },
      data: {
        tanggalWaktu: body.tanggalWaktu ? new Date(body.tanggalWaktu) : undefined,
        tipe: body.tipe,
        asetId: body.asetId,
        kategoriId: body.kategoriId,
        nominal: body.nominal,
        deskripsi: body.deskripsi,
        catatan: body.catatan,
        isBookmark: body.isBookmark,
      },
      include: { aset: true, kategori: true, user: true },
    })
    return NextResponse.json(tx)
  } catch (error) {
    console.error('Transaksi PUT error:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const existing = await db.transaksi.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!existing.isAdjustment) {
      const mul = existing.tipe === 'Pemasukan' ? 1 : -1
      await db.aset.update({
        where: { id: existing.asetId },
        data: { saldoBerjalan: { decrement: existing.nominal * mul } },
      })
      if (existing.tipe === 'Transfer' && existing.asetTujuanId) {
        await db.aset.update({
          where: { id: existing.asetTujuanId },
          data: { saldoBerjalan: { decrement: existing.nominal } },
        })
      }
    }
    await db.transaksi.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
