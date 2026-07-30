import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper untuk mendapatkan periode
const getPeriode = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Helper untuk mendapatkan date range
const getMonthRange = (year: number, month: number) => {
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { startDate, endDate }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedPeriode = searchParams.get('periode')
    
    const now = new Date()
    let currentYear: number, currentMonth: number
    
    if (requestedPeriode && /^\d{4}-\d{2}$/.test(requestedPeriode)) {
      const [year, month] = requestedPeriode.split('-').map(Number)
      currentYear = year
      currentMonth = month - 1 // JavaScript months are 0-based
    } else {
      currentYear = now.getFullYear()
      currentMonth = now.getMonth()
    }
    
    // Hitung periode saat ini dan bulan lalu
    const currentPeriode = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    
    // Bulan lalu dengan handling untuk Januari
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
    const lastPeriode = getPeriode(lastMonthDate)
    
    // Date ranges
    const { startDate: currentStart, endDate: currentEnd } = getMonthRange(currentYear, currentMonth)
    const { startDate: lastStart, endDate: lastEnd } = getMonthRange(
      lastMonthDate.getFullYear(), 
      lastMonthDate.getMonth()
    )
    
    // Gunakan transaction untuk konsistensi data
    const dashboardData = await db.$transaction(async (tx) => {
      // 1. Net Worth
      const assets = await tx.aset.findMany({ 
        where: { statusAktif: true },
        select: {
          saldoBerjalan: true,
          namaAset: true,
          icon: true,
        }
      })
      
      const netWorth = assets.reduce((sum, a) => sum + a.saldoBerjalan, 0)
      
      // 2. Income & Expense (current and last month)
      const [currentIncome, currentExpense, lastIncome, lastExpense] = await Promise.all([
        tx.transaksi.aggregate({
          _sum: { nominal: true },
          where: { 
            tipe: 'Pemasukan', 
            isAdjustment: false, 
            tanggalWaktu: { gte: currentStart, lte: currentEnd } 
          },
        }),
        tx.transaksi.aggregate({
          _sum: { nominal: true },
          where: { 
            tipe: 'Pengeluaran', 
            isAdjustment: false, 
            tanggalWaktu: { gte: currentStart, lte: currentEnd } 
          },
        }),
        tx.transaksi.aggregate({
          _sum: { nominal: true },
          where: { 
            tipe: 'Pemasukan', 
            isAdjustment: false, 
            tanggalWaktu: { gte: lastStart, lte: lastEnd } 
          },
        }),
        tx.transaksi.aggregate({
          _sum: { nominal: true },
          where: { 
            tipe: 'Pengeluaran', 
            isAdjustment: false, 
            tanggalWaktu: { gte: lastStart, lte: lastEnd } 
          },
        }),
      ])
      
      // 3. Recent transactions
      const recentTx = await tx.transaksi.findMany({
        take: 10,
        orderBy: { tanggalWaktu: 'desc' },
        where: {
          // Optional: hanya transaksi bulan ini
          // tanggalWaktu: { gte: currentStart, lte: currentEnd }
        },
        include: { 
          aset: {
            select: {
              id: true,
              namaAset: true,
              icon: true,
            }
          }, 
          kategori: {
            select: {
              id: true,
              namaKategori: true,
              icon: true,
              warna: true,
            }
          },
        },
      })
      
      // 4. Active targets
      const targets = await tx.target.findMany({
        where: { status: 'Aktif' },
        include: { 
          aset: {
            select: {
              id: true,
              namaAset: true,
              icon: true,
            }
          } 
        },
        orderBy: { tanggalTarget: 'asc' },
      })
      
      // 5. Budgets dengan progress
      const budgets = await tx.anggaran.findMany({
        where: { periode: currentPeriode },
        include: { 
          kategori: {
            select: {
              id: true,
              namaKategori: true,
              icon: true,
              warna: true,
            }
          } 
        },
      })
      
      // Hitung progress budget
      const budgetsWithProgress = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await tx.transaksi.aggregate({
            _sum: { nominal: true },
            where: {
              kategoriId: budget.kategoriId,
              tipe: 'Pengeluaran',
              isAdjustment: false,
              tanggalWaktu: { gte: currentStart, lte: currentEnd },
            },
          })
          
          return {
            ...budget,
            nominalTerpakai: spent._sum.nominal || 0,
            persentase: budget.nominalAnggaran > 0 
              ? Math.round(((spent._sum.nominal || 0) / budget.nominalAnggaran) * 100)
              : 0,
          }
        })
      )
      
      return {
        netWorth,
        assets: assets.map(a => ({
          nama: a.namaAset,
          icon: a.icon,
          saldo: a.saldoBerjalan,
        })),
        currentPeriode,
        lastPeriode,
        income: currentIncome._sum.nominal || 0,
        expense: currentExpense._sum.nominal || 0,
        lastIncome: lastIncome._sum.nominal || 0,
        lastExpense: lastExpense._sum.nominal || 0,
        balance: (currentIncome._sum.nominal || 0) - (currentExpense._sum.nominal || 0),
        recentTransactions: recentTx,
        targets,
        budgets: budgetsWithProgress,
        summary: {
          totalAssets: assets.length,
          totalTargets: targets.length,
          totalBudgets: budgets.length,
          budgetTotal: budgets.reduce((sum, b) => sum + b.nominalAnggaran, 0),
          budgetSpent: budgetsWithProgress.reduce((sum, b) => sum + b.nominalTerpakai, 0),
        }
      }
    })
    
    // Response dengan caching headers
    const response = NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
    })
    
    // Cache selama 5 menit
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
    
    return response
    
  } catch (error) {
    console.error('Dashboard error:', error)
    
    // Log detail error untuk debugging
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code)
    }
    
    return NextResponse.json(
      { error: 'Gagal memuat dashboard' }, 
      { status: 500 }
    )
  }
}
