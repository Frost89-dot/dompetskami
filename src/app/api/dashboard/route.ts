import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

    // Net worth: sum all active assets saldo_berjalan
    const assets = await db.aset.findMany({ where: { statusAktif: true } })
    const netWorth = assets.reduce((sum, a) => sum + a.saldoBerjalan, 0)

    // Current month income & expense (exclude adjustments)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
    const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59)

    const [currentIncome, currentExpense, lastIncome, lastExpense] = await Promise.all([
      db.transaksi.aggregate({
        _sum: { nominal: true },
        where: { tipe: 'Pemasukan', isAdjustment: false, tanggalWaktu: { gte: monthStart, lte: monthEnd } },
      }),
      db.transaksi.aggregate({
        _sum: { nominal: true },
        where: { tipe: 'Pengeluaran', isAdjustment: false, tanggalWaktu: { gte: monthStart, lte: monthEnd } },
      }),
      db.transaksi.aggregate({
        _sum: { nominal: true },
        where: { tipe: 'Pemasukan', isAdjustment: false, tanggalWaktu: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      db.transaksi.aggregate({
        _sum: { nominal: true },
        where: { tipe: 'Pengeluaran', isAdjustment: false, tanggalWaktu: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
    ])

    // Recent transactions
    const recentTx = await db.transaksi.findMany({
      take: 10,
      orderBy: { tanggalWaktu: 'desc' },
      include: { aset: true, kategori: true, user: true },
    })

    // Active targets
    const targets = await db.target.findMany({
      where: { status: 'Aktif' },
      include: { aset: true },
      orderBy: { tanggalTarget: 'asc' },
    })

    // Budget progress for current month
    const budgets = await db.anggaran.findMany({
      where: { periode: currentMonth, status: 'Aktif' },
      include: { kategori: true },
    })

    return NextResponse.json({
      netWorth,
      currentMonth,
      lastMonth: lastMonthStr,
      income: currentIncome._sum.nominal || 0,
      expense: currentExpense._sum.nominal || 0,
      lastIncome: lastIncome._sum.nominal || 0,
      lastExpense: lastExpense._sum.nominal || 0,
      recentTransactions: recentTx,
      targets,
      budgets,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
