import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'daily'
    const bulan = searchParams.get('bulan') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const asetId = searchParams.get('asetId')
    const kategoriId = searchParams.get('kategoriId')
    const pemilik = searchParams.get('pemilik')
    const search = searchParams.get('search')

    const [year, month] = bulan.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const baseWhere: any = {
      tanggalWaktu: { gte: startDate, lte: endDate },
    }
    if (asetId) baseWhere.asetId = asetId
    if (kategoriId) baseWhere.kategoriId = kategoriId
    if (pemilik) baseWhere.dicatatOleh = pemilik
    if (search) baseWhere.deskripsi = { contains: search }

    if (view === 'bookmark') {
      const txs = await db.transaksi.findMany({
        where: { ...baseWhere, isBookmark: true },
        orderBy: { tanggalWaktu: 'desc' },
        include: { aset: true, kategori: true, user: true, asetTujuan: true },
      })
      return NextResponse.json({ view: 'bookmark', transactions: txs })
    }

    if (view === 'summary') {
      const income = await db.transaksi.aggregate({
        _sum: { nominal: true },
        where: { ...baseWhere, tipe: 'Pemasukan', isAdjustment: false },
      })
      const expense = await db.transaksi.aggregate({
        _sum: { nominal: true },
        where: { ...baseWhere, tipe: 'Pengeluaran', isAdjustment: false },
      })
      const catBreakdown = await db.transaksi.groupBy({
        by: ['kategoriId'],
        _sum: { nominal: true },
        where: { ...baseWhere, tipe: 'Pengeluaran', isAdjustment: false, kategoriId: { not: null } },
      })
      const catIds = catBreakdown.map(c => c.kategoriId!)
      const cats = await db.kategori.findMany({ where: { id: { in: catIds } } })
      const catMap = Object.fromEntries(cats.map(c => [c.id, c]))

      const budgetProgress = await db.anggaran.findMany({
        where: { periode: bulan, status: 'Aktif' },
        include: { kategori: true },
      })

      return NextResponse.json({
        view: 'summary', periode: bulan,
        totalIncome: income._sum.nominal || 0,
        totalExpense: expense._sum.nominal || 0,
        categoryBreakdown: catBreakdown.map(c => ({
          kategoriId: c.kategoriId, nominal: c._sum.nominal || 0,
          ...(catMap[c.kategoriId!] || {}),
        })),
        budgetProgress,
      })
    }

    const transactions = await db.transaksi.findMany({
      where: baseWhere,
      orderBy: { tanggalWaktu: 'desc' },
      include: { aset: true, kategori: true, user: true, asetTujuan: true },
    })

    if (view === 'daily') {
      const grouped: Record<string, any[]> = {}
      for (const tx of transactions) {
        const dateKey = tx.tanggalWaktu.toISOString().split('T')[0]
        if (!grouped[dateKey]) grouped[dateKey] = []
        grouped[dateKey].push(tx)
      }
      const dailyGroups = Object.entries(grouped).map(([date, txs]) => {
        const dayIncome = txs.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0)
        const dayExpense = txs.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0)
        return { date, transactions: txs, dayIncome, dayExpense }
      })
      return NextResponse.json({ view: 'daily', periode: bulan, groups: dailyGroups })
    }

    if (view === 'calendar') {
      const calMap: Record<number, any[]> = {}
      for (const tx of transactions) {
        const day = tx.tanggalWaktu.getDate()
        if (!calMap[day]) calMap[day] = []
        calMap[day].push(tx)
      }
      const calDays = Object.entries(calMap).map(([day, txs]) => ({
        day: parseInt(day), transactions: txs,
        totalExpense: txs.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0),
        totalIncome: txs.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0),
      }))
      return NextResponse.json({ view: 'calendar', periode: bulan, days: calDays })
    }

    return NextResponse.json({ view, periode: bulan, transactions })
  } catch (error) {
    console.error('Transaksi GET error:', error)
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tanggalWaktu, tipe, asetId, asetTujuanId, kategoriId, nominal, deskripsi, catatan, dicatatOleh, sumberInput, statusReview } = body

    // ===== TRANSFER: 1 record, update both asset saldo =====
    if (tipe === 'Transfer' && asetTujuanId) {
      const [sourceAset, destAset] = await Promise.all([
        db.aset.findUnique({ where: { id: asetId } }),
        db.aset.findUnique({ where: { id: asetTujuanId } }),
      ])
      if (!sourceAset || !destAset) {
        return NextResponse.json({ error: 'Aset sumber atau tujuan tidak ditemukan' }, { status: 400 })
      }
      if (sourceAset.saldoBerjalan < nominal) {
        return NextResponse.json({ error: 'Saldo aset sumber tidak mencukupi' }, { status: 400 })
      }

      const tx = await db.transaksi.create({
        data: {
          tanggalWaktu: new Date(tanggalWaktu),
          tipe: 'Transfer',
          asetId,
          asetTujuanId,
          kategoriId: null,
          nominal,
          deskripsi,
          catatan: catatan || `Transfer: ${sourceAset.namaAset} → ${destAset.namaAset}`,
          dicatatOleh,
          sumberInput: 'Transfer',
          statusReview: 'Terverifikasi',
        },
        include: { aset: true, asetTujuan: true, user: true },
      })

      // Update saldo: kurangi sumber, tambah tujuan
      await db.aset.update({
        where: { id: asetId },
        data: { saldoBerjalan: { decrement: nominal } },
      })
      await db.aset.update({
        where: { id: asetTujuanId },
        data: { saldoBerjalan: { increment: nominal } },
      })

      return NextResponse.json(tx, { status: 201 })
    }

    // ===== NORMAL: single transaction =====
    const tx = await db.transaksi.create({
      data: {
        tanggalWaktu: new Date(tanggalWaktu),
        tipe,
        asetId,
        asetTujuanId: asetTujuanId || null,
        kategoriId: kategoriId || null,
        nominal,
        deskripsi,
        catatan: catatan || '',
        dicatatOleh,
        sumberInput: sumberInput || 'Manual',
        statusReview: statusReview || 'Terverifikasi',
      },
      include: { aset: true, kategori: true, user: true },
    })

    // Update saldo berjalan
    const multiplier = tipe === 'Pemasukan' ? 1 : -1
    await db.aset.update({
      where: { id: asetId },
      data: { saldoBerjalan: { increment: nominal * multiplier } },
    })

    return NextResponse.json(tx, { status: 201 })
  } catch (error) {
    console.error('Transaksi POST error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
