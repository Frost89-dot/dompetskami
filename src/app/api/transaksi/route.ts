import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ==================== GET - List Transactions ====================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'daily'
    const bulan = searchParams.get('bulan') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const asetId = searchParams.get('asetId')
    const kategoriId = searchParams.get('kategoriId')
    const pemilik = searchParams.get('pemilik')
    const search = searchParams.get('search')
    const tipe = searchParams.get('tipe')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    // Validasi view
    const validViews = ['daily', 'calendar', 'summary', 'bookmark', 'monthly']
    if (!validViews.includes(view)) {
      return NextResponse.json(
        { error: `View tidak valid. Pilihan: ${validViews.join(', ')}` }, 
        { status: 400 }
      )
    }

    // Validasi bulan
    if (!/^\d{4}-\d{2}$/.test(bulan)) {
      return NextResponse.json(
        { error: 'Format bulan tidak valid (YYYY-MM)' }, 
        { status: 400 }
      )
    }

    const [year, month] = bulan.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Build where clause
    const baseWhere: any = {
      tanggalWaktu: { gte: startDate, lte: endDate },
    }
    
    if (asetId) baseWhere.asetId = asetId
    if (kategoriId) baseWhere.kategoriId = kategoriId
    if (pemilik) baseWhere.dicatatOleh = pemilik
    if (tipe) baseWhere.tipe = tipe
    
    if (search) {
      baseWhere.deskripsi = { 
        contains: search, 
        mode: 'insensitive' 
      }
    }

    // ===== BOOKMARK VIEW =====
    if (view === 'bookmark') {
      const skip = (page - 1) * limit
      const totalCount = await db.transaksi.count({
        where: { ...baseWhere, isBookmark: true }
      })
      
      const txs = await db.transaksi.findMany({
        where: { ...baseWhere, isBookmark: true },
        orderBy: { tanggalWaktu: 'desc' },
        skip,
        take: limit,
        include: { 
          aset: { select: { id: true, namaAset: true, icon: true } }, 
          kategori: { select: { id: true, namaKategori: true, icon: true, warna: true } }, 
          user: { select: { id: true, nama: true, email: true } }, 
          asetTujuan: { select: { id: true, namaAset: true, icon: true } },
        },
      })
      
      return NextResponse.json({ 
        success: true,
        view: 'bookmark', 
        data: txs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        }
      })
    }

    // ===== SUMMARY VIEW =====
    if (view === 'summary') {
      const [income, expense, catBreakdown, budgets] = await Promise.all([
        db.transaksi.aggregate({
          _sum: { nominal: true },
          _count: true,
          where: { ...baseWhere, tipe: 'Pemasukan', isAdjustment: false },
        }),
        db.transaksi.aggregate({
          _sum: { nominal: true },
          _count: true,
          where: { ...baseWhere, tipe: 'Pengeluaran', isAdjustment: false },
        }),
        db.transaksi.groupBy({
          by: ['kategoriId'],
          _sum: { nominal: true },
          _count: true,
          where: { ...baseWhere, tipe: 'Pengeluaran', isAdjustment: false, kategoriId: { not: null } },
          orderBy: { _sum: { nominal: 'desc' } },
        }),
        db.anggaran.findMany({
          where: { periode: bulan },
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
        }),
      ])
      
      const catIds = catBreakdown.map(c => c.kategoriId!).filter(Boolean)
      const cats = catIds.length > 0 
        ? await db.kategori.findMany({ where: { id: { in: catIds } } })
        : []
      const catMap = Object.fromEntries(cats.map(c => [c.id, c]))

      // Calculate budget progress
      const budgetProgress = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await db.transaksi.aggregate({
            _sum: { nominal: true },
            where: {
              kategoriId: budget.kategoriId,
              tipe: 'Pengeluaran',
              isAdjustment: false,
              tanggalWaktu: { gte: startDate, lte: endDate },
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

      const totalIncome = income._sum.nominal || 0
      const totalExpense = expense._sum.nominal || 0

      return NextResponse.json({
        success: true,
        view: 'summary', 
        periode: bulan,
        dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: {
          income: income._count,
          expense: expense._count,
          total: income._count + expense._count,
        },
        categoryBreakdown: catBreakdown.map(c => ({
          kategoriId: c.kategoriId,
          namaKategori: catMap[c.kategoriId!]?.namaKategori || 'Tanpa Kategori',
          icon: catMap[c.kategoriId!]?.icon || '📦',
          warna: catMap[c.kategoriId!]?.warna || '#6B7280',
          nominal: c._sum.nominal || 0,
          count: c._count,
          persentase: totalExpense > 0 
            ? Math.round(((c._sum.nominal || 0) / totalExpense) * 100) 
            : 0,
        })),
        budgetProgress,
        budgetSummary: {
          totalBudget: budgets.reduce((sum, b) => sum + b.nominalAnggaran, 0),
          totalSpent: budgetProgress.reduce((sum, b) => sum + b.nominalTerpakai, 0),
          budgetCount: budgets.length,
        }
      })
    }

    // ===== DAILY / CALENDAR / DEFAULT VIEW =====
    const transactions = await db.transaksi.findMany({
      where: baseWhere,
      orderBy: { tanggalWaktu: 'desc' },
      include: { 
        aset: { select: { id: true, namaAset: true, icon: true } }, 
        kategori: { select: { id: true, namaKategori: true, icon: true, warna: true } }, 
        user: { select: { id: true, nama: true, email: true } }, 
        asetTujuan: { select: { id: true, namaAset: true, icon: true } },
      },
    })

    // ===== DAILY VIEW =====
    if (view === 'daily') {
      const grouped: Record<string, any[]> = {}
      for (const tx of transactions) {
        const dateKey = tx.tanggalWaktu.toISOString().split('T')[0]
        if (!grouped[dateKey]) grouped[dateKey] = []
        grouped[dateKey].push(tx)
      }
      
      const dailyGroups = Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a)) // Sort by date desc
        .map(([date, txs]) => {
          const dayIncome = txs.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0)
          const dayExpense = txs.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0)
          const dayTransfer = txs.filter(t => t.tipe === 'Transfer').reduce((s, t) => s + t.nominal, 0)
          
          return { 
            date, 
            transactions: txs, 
            dayIncome, 
            dayExpense,
            dayTransfer,
            dayNet: dayIncome - dayExpense,
            transactionCount: txs.length,
          }
        })
      
      return NextResponse.json({ 
        success: true,
        view: 'daily', 
        periode: bulan,
        data: dailyGroups,
        summary: {
          totalDays: dailyGroups.length,
          totalTransactions: transactions.length,
          totalIncome: dailyGroups.reduce((s, d) => s + d.dayIncome, 0),
          totalExpense: dailyGroups.reduce((s, d) => s + d.dayExpense, 0),
        }
      })
    }

    // ===== CALENDAR VIEW =====
    if (view === 'calendar') {
      const calMap: Record<number, any[]> = {}
      for (const tx of transactions) {
        const day = tx.tanggalWaktu.getDate()
        if (!calMap[day]) calMap[day] = []
        calMap[day].push(tx)
      }
      
      const calDays = Object.entries(calMap).map(([day, txs]) => ({
        day: parseInt(day), 
        transactions: txs,
        totalExpense: txs.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0),
        totalIncome: txs.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0),
        totalTransfer: txs.filter(t => t.tipe === 'Transfer').reduce((s, t) => s + t.nominal, 0),
        count: txs.length,
      }))
      
      return NextResponse.json({ 
        success: true,
        view: 'calendar', 
        periode: bulan,
        daysInMonth: new Date(year, month, 0).getDate(),
        firstDayOfWeek: new Date(year, month - 1, 1).getDay(),
        data: calDays,
      })
    }

    // Default view
    return NextResponse.json({ 
      success: true,
      view, 
      periode: bulan, 
      data: transactions,
      count: transactions.length,
    })
    
  } catch (error) {
    console.error('Transaksi GET error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data transaksi' }, 
      { status: 500 }
    )
  }
}

// ==================== POST - Create Transaction ====================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      tanggalWaktu, 
      tipe, 
      asetId, 
      asetTujuanId, 
      kategoriId, 
      nominal, 
      deskripsi, 
      catatan, 
      dicatatOleh, 
      sumberInput = 'Manual',
      statusReview = 'Terverifikasi' 
    } = body

    // ===== VALIDASI INPUT =====
    
    // Validasi required fields
    if (!tanggalWaktu) {
      return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 })
    }
    
    const parsedDate = new Date(tanggalWaktu)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 })
    }
    
    // Validasi tipe
    if (!tipe || !['Pemasukan', 'Pengeluaran', 'Transfer'].includes(tipe)) {
      return NextResponse.json(
        { error: 'Tipe transaksi tidak valid (Pemasukan, Pengeluaran, Transfer)' }, 
        { status: 400 }
      )
    }
    
    // Validasi nominal
    if (!nominal || typeof nominal !== 'number' || nominal <= 0) {
      return NextResponse.json({ error: 'Nominal harus berupa angka positif' }, { status: 400 })
    }
    
    if (nominal > 1000000000000) { // 1 triliun
      return NextResponse.json({ error: 'Nominal terlalu besar (maksimal 1 triliun)' }, { status: 400 })
    }
    
    // Validasi deskripsi
    if (!deskripsi || typeof deskripsi !== 'string' || !deskripsi.trim()) {
      return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 })
    }
    
    if (deskripsi.length > 200) {
      return NextResponse.json({ error: 'Deskripsi maksimal 200 karakter' }, { status: 400 })
    }
    
    // Validasi aset sumber
    if (!asetId) {
      return NextResponse.json({ error: 'Aset sumber wajib diisi' }, { status: 400 })
    }
    
    // Validasi dicatat oleh
    if (!dicatatOleh) {
      return NextResponse.json({ error: 'Pencatat wajib diisi' }, { status: 400 })
    }
    
    // Validasi kategori (kecuali transfer)
    if (tipe !== 'Transfer' && !kategoriId) {
      return NextResponse.json({ error: 'Kategori wajib diisi untuk transaksi non-transfer' }, { status: 400 })
    }

    // ===== TRANSAKSI DENGAN TRANSACTION =====
    const result = await db.$transaction(async (tx) => {
      
      // ===== TRANSFER =====
      if (tipe === 'Transfer') {
        if (!asetTujuanId) {
          throw new Error('Aset tujuan wajib diisi untuk transfer')
        }
        
        if (asetId === asetTujuanId) {
          throw new Error('Aset sumber dan tujuan tidak boleh sama')
        }
        
        // Get both asets
        const [sourceAset, destAset] = await Promise.all([
          tx.aset.findUnique({ where: { id: asetId } }),
          tx.aset.findUnique({ where: { id: asetTujuanId } }),
        ])
        
        if (!sourceAset) {
          throw new Error('Aset sumber tidak ditemukan')
        }
        
        if (!destAset) {
          throw new Error('Aset tujuan tidak ditemukan')
        }
        
        if (!sourceAset.statusAktif) {
          throw new Error('Aset sumber sudah tidak aktif')
        }
        
        if (!destAset.statusAktif) {
          throw new Error('Aset tujuan sudah tidak aktif')
        }
        
        // Cek saldo cukup
        if (sourceAset.saldoBerjalan < nominal) {
          throw new Error(`Saldo tidak mencukupi. Saldo saat ini: ${sourceAset.saldoBerjalan.toLocaleString('id-ID')}`)
        }
        
        // Create transaction record
        const transferTx = await tx.transaksi.create({
          data: {
            tanggalWaktu: parsedDate,
            tipe: 'Transfer',
            asetId,
            asetTujuanId,
            kategoriId: null,
            nominal,
            deskripsi: deskripsi.trim(),
            catatan: catatan || `Transfer: ${sourceAset.namaAset} → ${destAset.namaAset}`,
            dicatatOleh,
            sumberInput: 'Transfer',
            statusReview: 'Terverifikasi',
          },
          include: { 
            aset: { select: { id: true, namaAset: true, icon: true, saldoBerjalan: true } }, 
            asetTujuan: { select: { id: true, namaAset: true, icon: true, saldoBerjalan: true } }, 
            user: { select: { id: true, nama: true } },
          },
        })
        
        // Update saldo: kurangi sumber, tambah tujuan
        await tx.aset.update({
          where: { id: asetId },
          data: { saldoBerjalan: { decrement: nominal } },
        })
        
        await tx.aset.update({
          where: { id: asetTujuanId },
          data: { saldoBerjalan: { increment: nominal } },
        })
        
        return {
          transaction: transferTx,
          type: 'transfer' as const,
        }
      }
      
      // ===== PENGELUARAN =====
      if (tipe === 'Pengeluaran') {
        const aset = await tx.aset.findUnique({ where: { id: asetId } })
        
        if (!aset) {
          throw new Error('Aset tidak ditemukan')
        }
        
        if (!aset.statusAktif) {
          throw new Error('Aset sudah tidak aktif')
        }
        
        // Cek saldo cukup
        if (aset.saldoBerjalan < nominal) {
          throw new Error(`Saldo tidak mencukupi. Saldo saat ini: ${aset.saldoBerjalan.toLocaleString('id-ID')}`)
        }
      }
      
      // ===== PEMASUKAN / PENGELUARAN =====
      const normalTx = await tx.transaksi.create({
        data: {
          tanggalWaktu: parsedDate,
          tipe,
          asetId,
          asetTujuanId: asetTujuanId || null,
          kategoriId: kategoriId || null,
          nominal,
          deskripsi: deskripsi.trim(),
          catatan: catatan || '',
          dicatatOleh,
          sumberInput: sumberInput || 'Manual',
          statusReview: statusReview || 'Terverifikasi',
        },
        include: { 
          aset: { select: { id: true, namaAset: true, icon: true, saldoBerjalan: true } }, 
          kategori: { select: { id: true, namaKategori: true, icon: true } }, 
          user: { select: { id: true, nama: true } },
        },
      })
      
      // Update saldo berjalan
      const multiplier = tipe === 'Pemasukan' ? 1 : -1
      await tx.aset.update({
        where: { id: asetId },
        data: { saldoBerjalan: { increment: nominal * multiplier } },
      })
      
      return {
        transaction: normalTx,
        type: 'normal' as const,
      }
    })
    
    return NextResponse.json({ 
      success: true,
      data: result.transaction,
      message: tipe === 'Transfer' 
        ? 'Transfer berhasil' 
        : `Transaksi ${tipe === 'Pemasukan' ? 'pemasukan' : 'pengeluaran'} berhasil dicatat`,
      type: result.type,
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Transaksi POST error:', error)
    
    // Handle validation errors
    if (error.message) {
      const clientErrors = [
        'Aset sumber tidak ditemukan',
        'Aset tujuan tidak ditemukan',
        'Saldo tidak mencukupi',
        'Aset sudah tidak aktif',
        'Aset sumber sudah tidak aktif',
        'Aset tujuan sudah tidak aktif',
        'Aset sumber dan tujuan tidak boleh sama',
        'Aset tujuan wajib diisi untuk transfer',
        'Aset tidak ditemukan',
      ]
      
      if (clientErrors.some(msg => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Data transaksi sudah ada' }, { status: 409 })
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal membuat transaksi. Silakan coba lagi.' }, 
      { status: 500 }
    )
  }
}
