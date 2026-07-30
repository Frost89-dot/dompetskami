import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'daily'
    const bulan = searchParams.get('bulan') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    const aset = await db.aset.findUnique({ where: { id } })
    if (!aset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let startDate: Date, endDate: Date
    const [year, month] = bulan.split('-').map(Number)

    if (view === 'yearly') {
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31, 23, 59, 59)
    } else {
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0, 23, 59, 59)
    }

    const transactions = await db.transaksi.findMany({
      where: { asetId: id, tanggalWaktu: { gte: startDate, lte: endDate } },
      orderBy: { tanggalWaktu: 'desc' },
      include: { kategori: true, user: true },
    })

    const totalIn = transactions.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0)
    const totalOut = transactions.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0)

    return NextResponse.json({ aset, transactions, totalIn, totalOut, view, periode: bulan })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load asset detail' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const aset = await db.aset.update({
      where: { id },
      data: {
        namaAset: body.namaAset,
        jenisGrup: body.jenisGrup,
        pemilik: body.pemilik,
        visibilitas: body.visibilitas,
        icon: body.icon,
        statusAktif: body.statusAktif,
      },
    })
    return NextResponse.json(aset)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { saldoBaru, dicatatOleh } = await req.json()
    const aset = await db.aset.findUnique({ where: { id } })
    if (!aset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const diff = saldoBaru - aset.saldoBerjalan
    const tipe = diff >= 0 ? 'Pemasukan' : 'Pengeluaran'

    await db.transaksi.create({
      data: {
        tanggalWaktu: new Date(),
        tipe,
        asetId: id,
        nominal: Math.abs(diff),
        deskripsi: `Penyesuaian Saldo ${aset.namaAset}`,
        catatan: `Saldo diubah dari ${aset.saldoBerjalan} menjadi ${saldoBaru}`,
        isAdjustment: true,
        dicatatOleh,
        statusReview: 'Terverifikasi',
      },
    })

    const updated = await db.aset.update({
      where: { id },
      data: { saldoBerjalan: saldoBaru },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Adjustment error:', error)
    return NextResponse.json({ error: 'Failed to adjust saldo' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // Soft delete: set statusAktif to false
    await db.aset.update({
      where: { id },
      data: { statusAktif: false },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
  }
}
