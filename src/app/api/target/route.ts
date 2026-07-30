import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Valid types
const VALID_JENIS = ['Tabungan', 'Investasi', 'Dana Darurat', 'Liburan', 'Pendidikan', 'Properti', 'Kendaraan', 'Lainnya'] as const
const VALID_STATUS = ['Aktif', 'Tercapai', 'Dibatalkan'] as const
const VALID_PEMILIK = ['Bersama', 'Suami', 'Istri'] as const

// ==================== GET - List Targets ====================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Filter parameters
    const status = searchParams.get('status')
    const jenis = searchParams.get('jenis')
    const pemilik = searchParams.get('pemilik')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'deadline' // deadline, newest, progress
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    
    // Build where clause
    const where: any = {}
    
    // Filter by status
    if (status && VALID_STATUS.includes(status as any)) {
      where.status = status
    } else {
      // Default: hanya target aktif
      where.status = searchParams.get('status') ? undefined : 'Aktif'
    }
    
    // Filter by jenis
    if (jenis && VALID_JENIS.includes(jenis as any)) {
      where.jenisTarget = jenis
    }
    
    // Filter by pemilik
    if (pemilik && VALID_PEMILIK.includes(pemilik as any)) {
      where.pemilik = pemilik
    }
    
    // Filter by user
    if (userId) {
      where.userId = userId
    }
    
    // Search by nama
    if (search) {
      where.namaTarget = {
        contains: search,
        mode: 'insensitive',
      }
    }
    
    // Build orderBy
    let orderBy: any[] = []
    
    switch (sort) {
      case 'newest':
        orderBy = [{ createdAt: 'desc' }]
        break
      case 'progress':
        orderBy = [{ status: 'asc' }, { tanggalTarget: 'asc' }]
        break
      case 'deadline':
      default:
        orderBy = [{ status: 'asc' }, { tanggalTarget: 'asc' }]
        break
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit
    
    // Get total count
    const totalCount = await db.target.count({ where })
    
    // Get targets
    const targets = await db.target.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { 
        aset: {
          select: {
            id: true,
            namaAset: true,
            icon: true,
            saldoBerjalan: true,
          }
        } 
      },
    })
    
    // Calculate progress for each target
    const targetsWithProgress = targets.map(target => ({
      ...target,
      progress: target.nominalTarget > 0 
        ? Math.round((target.nominalTerkumpul / target.nominalTarget) * 100)
        : 0,
      sisa: Math.max(0, target.nominalTarget - target.nominalTerkumpul),
      hariTersisa: Math.max(0, Math.ceil(
        (new Date(target.tanggalTarget).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )),
      isOverdue: new Date(target.tanggalTarget) < new Date() && target.status === 'Aktif',
    }))
    
    // Summary
    const summary = {
      total: targets.length,
      aktif: targets.filter(t => t.status === 'Aktif').length,
      tercapai: targets.filter(t => t.status === 'Tercapai').length,
      dibatalkan: targets.filter(t => t.status === 'Dibatalkan').length,
      totalNominal: targets.reduce((sum, t) => sum + t.nominalTarget, 0),
      totalTerkumpul: targets.reduce((sum, t) => sum + t.nominalTerkumpul, 0),
      overallProgress: targets.length > 0
        ? Math.round(
            (targets.reduce((sum, t) => sum + t.nominalTerkumpul, 0) / 
             targets.reduce((sum, t) => sum + t.nominalTarget, 0)) * 100
          )
        : 0,
    }
    
    return NextResponse.json({ 
      success: true,
      data: targetsWithProgress,
      summary,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + targets.length < totalCount,
      },
      filters: {
        status: status || 'Aktif',
        jenis: jenis || null,
        pemilik: pemilik || null,
        userId: userId || null,
        search: search || null,
        sort,
      }
    })
    
  } catch (error) {
    console.error('Error fetching targets:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data target' }, 
      { status: 500 }
    )
  }
}

// ==================== POST - Create Target ====================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      namaTarget, 
      jenisTarget = 'Tabungan', 
      nominalTarget, 
      nominalTerkumpul = 0,
      asetTerkaitId = null,
      tanggalMulai,
      tanggalTarget, 
      pemilik = 'Bersama',
      userId,
      catatan,
    } = body
    
    // Validasi nama target
    if (!namaTarget || typeof namaTarget !== 'string' || !namaTarget.trim()) {
      return NextResponse.json(
        { error: 'Nama target wajib diisi' }, 
        { status: 400 }
      )
    }
    
    const trimmedNama = namaTarget.trim()
    
    if (trimmedNama.length < 3 || trimmedNama.length > 100) {
      return NextResponse.json(
        { error: 'Nama target harus antara 3-100 karakter' }, 
        { status: 400 }
      )
    }
    
    // Validasi jenis target
    if (!VALID_JENIS.includes(jenisTarget)) {
      return NextResponse.json(
        { error: `Jenis target tidak valid. Pilihan: ${VALID_JENIS.join(', ')}` }, 
        { status: 400 }
      )
    }
    
    // Validasi nominal target
    if (!nominalTarget || typeof nominalTarget !== 'number' || nominalTarget <= 0) {
      return NextResponse.json(
        { error: 'Nominal target harus berupa angka positif' }, 
        { status: 400 }
      )
    }
    
    if (nominalTarget < 10000) {
      return NextResponse.json(
        { error: 'Nominal target minimal Rp 10.000' }, 
        { status: 400 }
      )
    }
    
    if (nominalTarget > 1000000000000) { // 1 triliun
      return NextResponse.json(
        { error: 'Nominal target terlalu besar (maksimal 1 triliun)' }, 
        { status: 400 }
      )
    }
    
    // Validasi nominal terkumpul
    if (nominalTerkumpul < 0 || nominalTerkumpul > nominalTarget) {
      return NextResponse.json(
        { error: 'Nominal terkumpul tidak valid (0 sampai nominal target)' }, 
        { status: 400 }
      )
    }
    
    // Validasi tanggal
    if (!tanggalTarget) {
      return NextResponse.json(
        { error: 'Tanggal target wajib diisi' }, 
        { status: 400 }
      )
    }
    
    const targetDate = new Date(tanggalTarget)
    const startDate = tanggalMulai ? new Date(tanggalMulai) : new Date()
    
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Format tanggal target tidak valid' }, 
        { status: 400 }
      )
    }
    
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Format tanggal mulai tidak valid' }, 
        { status: 400 }
      )
    }
    
    // Target date harus di masa depan
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (targetDate < today) {
      return NextResponse.json(
        { error: 'Tanggal target tidak boleh di masa lalu' }, 
        { status: 400 }
      )
    }
    
    // Maksimal 5 tahun ke depan
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 5)
    
    if (targetDate > maxDate) {
      return NextResponse.json(
        { error: 'Tanggal target maksimal 5 tahun ke depan' }, 
        { status: 400 }
      )
    }
    
    // Tanggal mulai tidak boleh setelah tanggal target
    if (startDate > targetDate) {
      return NextResponse.json(
        { error: 'Tanggal mulai tidak boleh setelah tanggal target' }, 
        { status: 400 }
      )
    }
    
    // Validasi pemilik
    if (!VALID_PEMILIK.includes(pemilik)) {
      return NextResponse.json(
        { error: `Pemilik tidak valid. Pilihan: ${VALID_PEMILIK.join(', ')}` }, 
        { status: 400 }
      )
    }
    
    // Validasi aset jika ada
    if (asetTerkaitId) {
      const aset = await db.aset.findUnique({ 
        where: { id: asetTerkaitId },
        select: { id: true, statusAktif: true }
      })
      
      if (!aset) {
        return NextResponse.json(
          { error: 'Aset tidak ditemukan' }, 
          { status: 404 }
        )
      }
      
      if (!aset.statusAktif) {
        return NextResponse.json(
          { error: 'Aset sudah tidak aktif' }, 
          { status: 400 }
        )
      }
    }
    
    // Validasi user
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID wajib diisi' }, 
        { status: 400 }
      )
    }
    
    // Cek user exists
    const user = await db.user.findUnique({ 
      where: { id: userId },
      select: { id: true }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' }, 
        { status: 404 }
      )
    }
    
    // Cek duplikasi nama target (opsional)
    const existingTarget = await db.target.findFirst({
      where: { 
        namaTarget: trimmedNama,
        userId: userId,
        status: 'Aktif',
      }
    })
    
    if (existingTarget) {
      return NextResponse.json(
        { error: 'Kamu sudah memiliki target aktif dengan nama yang sama' }, 
        { status: 409 }
      )
    }
    
    // Tentukan status awal
    const initialStatus = nominalTerkumpul >= nominalTarget ? 'Tercapai' : 'Aktif'
    
    // Buat target baru
    const target = await db.target.create({
      data: {
        namaTarget: trimmedNama,
        jenisTarget,
        nominalTarget,
        nominalTerkumpul: nominalTerkumpul || 0,
        asetTerkaitId: asetTerkaitId || null,
        tanggalMulai: startDate,
        tanggalTarget: targetDate,
        pemilik,
        userId,
        status: initialStatus,
        catatan: catatan || '',
      },
      include: { 
        aset: {
          select: {
            id: true,
            namaAset: true,
            icon: true,
          }
        } 
      },
    })
    
    const progress = target.nominalTarget > 0 
      ? Math.round((target.nominalTerkumpul / target.nominalTarget) * 100)
      : 0
    
    return NextResponse.json({ 
      success: true,
      data: {
        ...target,
        progress,
        sisa: Math.max(0, target.nominalTarget - target.nominalTerkumpul),
        hariTersisa: Math.ceil(
          (targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
      message: initialStatus === 'Tercapai' 
        ? '🎉 Target langsung tercapai!' 
        : 'Target berhasil dibuat',
      isCompleted: initialStatus === 'Tercapai',
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create target error:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Target dengan data tersebut sudah ada' }, 
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal membuat target' }, 
      { status: 500 }
    )
  }
}
