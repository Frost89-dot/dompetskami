import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Validasi tipe kategori
const VALID_TYPES = ['Pemasukan', 'Pengeluaran'] as const
type KategoriTipe = typeof VALID_TYPES[number]

const isValidTipe = (tipe: string): tipe is KategoriTipe => {
  return VALID_TYPES.includes(tipe as KategoriTipe)
}

// Default categories untuk seeding
const DEFAULT_CATEGORIES = [
  // Pemasukan
  { namaKategori: 'Gaji', tipe: 'Pemasukan', icon: '💼', warna: '#10B981' },
  { namaKategori: 'Bonus', tipe: 'Pemasukan', icon: '🎁', warna: '#34D399' },
  { namaKategori: 'Freelance', tipe: 'Pemasukan', icon: '💻', warna: '#6EE7B7' },
  { namaKategori: 'Investasi', tipe: 'Pemasukan', icon: '📈', warna: '#3B82F6' },
  { namaKategori: 'Bisnis', tipe: 'Pemasukan', icon: '🏪', warna: '#8B5CF6' },
  { namaKategori: 'Hadiah', tipe: 'Pemasukan', icon: '🎀', warna: '#EC4899' },
  { namaKategori: 'Lainnya', tipe: 'Pemasukan', icon: '💰', warna: '#6B7280' },
  
  // Pengeluaran
  { namaKategori: 'Makanan & Minuman', tipe: 'Pengeluaran', icon: '🍽️', warna: '#EF4444' },
  { namaKategori: 'Transportasi', tipe: 'Pengeluaran', icon: '🚗', warna: '#F97316' },
  { namaKategori: 'Belanja', tipe: 'Pengeluaran', icon: '🛒', warna: '#EC4899' },
  { namaKategori: 'Tagihan', tipe: 'Pengeluaran', icon: '📋', warna: '#6366F1' },
  { namaKategori: 'Hiburan', tipe: 'Pengeluaran', icon: '🎮', warna: '#8B5CF6' },
  { namaKategori: 'Kesehatan', tipe: 'Pengeluaran', icon: '🏥', warna: '#06B6D4' },
  { namaKategori: 'Pendidikan', tipe: 'Pengeluaran', icon: '📚', warna: '#14B8A6' },
  { namaKategori: 'Rumah Tangga', tipe: 'Pengeluaran', icon: '🏠', warna: '#F59E0B' },
  { namaKategori: 'Kecantikan', tipe: 'Pengeluaran', icon: '💄', warna: '#EC4899' },
  { namaKategori: 'Olahraga', tipe: 'Pengeluaran', icon: '⚽', warna: '#10B981' },
  { namaKategori: 'Lainnya', tipe: 'Pengeluaran', icon: '📦', warna: '#6B7280' },
]

// Sub-kategori default
const DEFAULT_SUB_CATEGORIES = [
  // Sub-kategori Makanan & Minuman
  { namaKategori: 'Makan di Luar', tipe: 'Pengeluaran', icon: '🍕', warna: '#EF4444', parentName: 'Makanan & Minuman' },
  { namaKategori: 'Belanja Bahan', tipe: 'Pengeluaran', icon: '🥬', warna: '#F87171', parentName: 'Makanan & Minuman' },
  { namaKategori: 'Kopi & Camilan', tipe: 'Pengeluaran', icon: '☕', warna: '#FCA5A5', parentName: 'Makanan & Minuman' },
  
  // Sub-kategori Transportasi
  { namaKategori: 'Bensin', tipe: 'Pengeluaran', icon: '⛽', warna: '#F97316', parentName: 'Transportasi' },
  { namaKategori: 'Transport Online', tipe: 'Pengeluaran', icon: '🚕', warna: '#FB923C', parentName: 'Transportasi' },
  { namaKategori: 'Parkir & Tol', tipe: 'Pengeluaran', icon: '🅿️', warna: '#FDBA74', parentName: 'Transportasi' },
  
  // Sub-kategori Tagihan
  { namaKategori: 'Listrik & Air', tipe: 'Pengeluaran', icon: '💡', warna: '#6366F1', parentName: 'Tagihan' },
  { namaKategori: 'Internet & Pulsa', tipe: 'Pengeluaran', icon: '📱', warna: '#818CF8', parentName: 'Tagihan' },
  { namaKategori: 'Sewa & Cicilan', tipe: 'Pengeluaran', icon: '🏘️', warna: '#A5B4FC', parentName: 'Tagihan' },
]

// ==================== GET ====================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Optional filters
    const tipe = searchParams.get('tipe')
    const parentOnly = searchParams.get('parentOnly') === 'true'
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    // Build where clause
    const where: any = {}
    
    if (tipe && isValidTipe(tipe)) {
      where.tipe = tipe
    }
    
    if (parentOnly) {
      where.parentKategoriId = null
    }
    
    if (search) {
      where.namaKategori = {
        contains: search,
        mode: 'insensitive',
      }
    }
    
    if (!includeInactive) {
      where.statusAktif = true
    }
    
    const kategories = await db.kategori.findMany({
      where,
      include: { 
        children: {
          where: includeInactive ? {} : { statusAktif: true },
          orderBy: { namaKategori: 'asc' },
          select: {
            id: true,
            namaKategori: true,
            icon: true,
            tipe: true,
            warna: true,
            statusAktif: true,
          }
        },
        _count: {
          select: {
            transaksi: true,
            children: true,
          }
        }
      },
      orderBy: [
        { tipe: 'asc' },
        { namaKategori: 'asc' },
      ],
      select: {
        id: true,
        namaKategori: true,
        icon: true,
        tipe: true,
        warna: true,
        parentKategoriId: true,
        statusAktif: true,
        createdAt: true,
        updatedAt: true,
        children: true,
        _count: true,
      }
    })
    
    // Group kategories by tipe
    const grouped = kategories.reduce((acc, k) => {
      if (!acc[k.tipe]) {
        acc[k.tipe] = []
      }
      acc[k.tipe].push(k)
      return acc
    }, {} as Record<string, typeof kategories>)
    
    // Summary
    const summary = {
      total: kategories.length,
      pemasukan: grouped['Pemasukan']?.length || 0,
      pengeluaran: grouped['Pengeluaran']?.length || 0,
      parentOnly: kategories.filter(k => !k.parentKategoriId).length,
      subKategories: kategories.filter(k => k.parentKategoriId).length,
      withChildren: kategories.filter(k => k._count.children > 0).length,
      active: kategories.filter(k => k.statusAktif).length,
      inactive: kategories.filter(k => !k.statusAktif).length,
    }
    
    return NextResponse.json({ 
      success: true,
      data: {
        all: kategories,
        grouped,
        summary,
      },
      filters: {
        tipe: tipe || null,
        parentOnly,
        search: search || null,
        includeInactive,
      }
    })
    
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data kategori' }, 
      { status: 500 }
    )
  }
}

// ==================== POST ====================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Check if this is a seed request
    if (body.action === 'seed_defaults') {
      return handleSeedDefaults()
    }
    
    const { 
      namaKategori, 
      tipe, 
      icon = '📁', 
      warna = '#6B7280',
      parentKategoriId = null 
    } = body
    
    // Validasi required fields
    if (!namaKategori || typeof namaKategori !== 'string' || !namaKategori.trim()) {
      return NextResponse.json(
        { error: 'Nama kategori wajib diisi' }, 
        { status: 400 }
      )
    }
    
    if (!tipe || !isValidTipe(tipe)) {
      return NextResponse.json(
        { error: `Tipe kategori tidak valid. Pilihan: ${VALID_TYPES.join(', ')}` }, 
        { status: 400 }
      )
    }
    
    // Validasi nama kategori
    const trimmedNama = namaKategori.trim()
    if (trimmedNama.length < 2 || trimmedNama.length > 30) {
      return NextResponse.json(
        { error: 'Nama kategori harus antara 2-30 karakter' }, 
        { status: 400 }
      )
    }
    
    // Validasi icon (harus emoji tunggal)
    if (icon && (typeof icon !== 'string' || icon.length > 2)) {
      return NextResponse.json(
        { error: 'Icon harus berupa emoji tunggal' }, 
        { status: 400 }
      )
    }
    
    // Validasi warna (hex color)
    if (warna && !/^#[0-9A-Fa-f]{6}$/.test(warna)) {
      return NextResponse.json(
        { error: 'Warna harus dalam format hex (#RRGGBB)' }, 
        { status: 400 }
      )
    }
    
    // Validasi parent kategori jika ada
    if (parentKategoriId) {
      const parent = await db.kategori.findUnique({
        where: { id: parentKategoriId },
        select: { id: true, tipe: true, parentKategoriId: true }
      })
      
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent kategori tidak ditemukan' }, 
          { status: 404 }
        )
      }
      
      // Pastikan tipe parent sama dengan child
      if (parent.tipe !== tipe) {
        return NextResponse.json(
          { error: 'Tipe kategori anak harus sama dengan parent' }, 
          { status: 400 }
        )
      }
      
      // Cegah nested terlalu dalam (maksimal 2 level)
      if (parent.parentKategoriId) {
        return NextResponse.json(
          { error: 'Tidak dapat membuat sub-kategori dari sub-kategori' }, 
          { status: 400 }
        )
      }
    }
    
    // Cek duplikasi nama (dalam tipe dan parent yang sama)
    const existingKategori = await db.kategori.findFirst({
      where: { 
        namaKategori: trimmedNama,
        tipe: tipe,
        parentKategoriId: parentKategoriId,
        statusAktif: true,
      }
    })
    
    if (existingKategori) {
      return NextResponse.json(
        { error: 'Kategori dengan nama tersebut sudah ada' }, 
        { status: 409 }
      )
    }
    
    // Buat kategori baru
    const kategori = await db.kategori.create({
      data: {
        namaKategori: trimmedNama,
        tipe,
        icon: icon || '📁',
        warna: warna || '#6B7280',
        parentKategoriId: parentKategoriId || null,
      },
      select: {
        id: true,
        namaKategori: true,
        tipe: true,
        icon: true,
        warna: true,
        parentKategoriId: true,
        statusAktif: true,
        createdAt: true,
      }
    })
    
    return NextResponse.json({ 
      success: true,
      data: kategori,
      message: 'Kategori berhasil dibuat' 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create kategori error:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Kategori dengan nama tersebut sudah ada' }, 
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Gagal membuat kategori' }, 
      { status: 500 }
    )
  }
}

// ==================== PUT ====================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    
    if (action === 'seed_defaults') {
      return handleSeedDefaults()
    }
    
    if (action === 'seed_with_subcategories') {
      return handleSeedWithSubCategories()
    }
    
    return NextResponse.json(
      { error: 'Action tidak valid. Gunakan: seed_defaults, seed_with_subcategories' }, 
      { status: 400 }
    )
    
  } catch (error) {
    console.error('PUT kategori error:', error)
    return NextResponse.json(
      { error: 'Gagal menjalankan action' }, 
      { status: 500 }
    )
  }
}

// ==================== DELETE ====================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    
    if (action === 'reset_all') {
      // Hapus semua kategori (hati-hati!)
      const deleted = await db.kategori.deleteMany()
      
      return NextResponse.json({
        success: true,
        message: `${deleted.count} kategori berhasil dihapus`,
        data: { deletedCount: deleted.count }
      })
    }
    
    return NextResponse.json(
      { error: 'Gunakan parameter ?action=reset_all untuk menghapus semua kategori' }, 
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Delete kategori error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus kategori' }, 
      { status: 500 }
    )
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Seed default categories (parent only)
 */
async function handleSeedDefaults() {
  try {
    const results = await db.$transaction(
      DEFAULT_CATEGORIES.map(cat => 
        db.kategori.upsert({
          where: {
            namaKategori_tipe_parentKategoriId: {
              namaKategori: cat.namaKategori,
              tipe: cat.tipe,
              parentKategoriId: null,
            }
          },
          update: {
            icon: cat.icon,
            warna: cat.warna,
            statusAktif: true,
          },
          create: {
            ...cat,
            parentKategoriId: null,
          },
        })
      )
    )
    
    return NextResponse.json({
      success: true,
      message: `${results.length} kategori default berhasil dibuat/diperbarui`,
      data: {
        categories: results,
        count: results.length,
      }
    })
    
  } catch (error) {
    console.error('Seed defaults error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat kategori default' }, 
      { status: 500 }
    )
  }
}

/**
 * Seed default categories with sub-categories
 */
async function handleSeedWithSubCategories() {
  try {
    const results = await db.$transaction(async (tx) => {
      const createdCategories = []
      
      // 1. Buat parent categories dulu
      for (const cat of DEFAULT_CATEGORIES) {
        const parent = await tx.kategori.upsert({
          where: {
            namaKategori_tipe_parentKategoriId: {
              namaKategori: cat.namaKategori,
              tipe: cat.tipe,
              parentKategoriId: null,
            }
          },
          update: {
            icon: cat.icon,
            warna: cat.warna,
            statusAktif: true,
          },
          create: {
            ...cat,
            parentKategoriId: null,
          },
        })
        
        createdCategories.push(parent)
      }
      
      // 2. Buat sub-categories
      const subCategories = []
      for (const sub of DEFAULT_SUB_CATEGORIES) {
        // Cari parent berdasarkan nama
        const parent = createdCategories.find(
          c => c.namaKategori === sub.parentName && c.tipe === sub.tipe
        )
        
        if (parent) {
          const child = await tx.kategori.upsert({
            where: {
              namaKategori_tipe_parentKategoriId: {
                namaKategori: sub.namaKategori,
                tipe: sub.tipe,
                parentKategoriId: parent.id,
              }
            },
            update: {
              icon: sub.icon,
              warna: sub.warna,
              statusAktif: true,
            },
            create: {
              namaKategori: sub.namaKategori,
              tipe: sub.tipe,
              icon: sub.icon,
              warna: sub.warna,
              parentKategoriId: parent.id,
            },
          })
          
          subCategories.push(child)
        }
      }
      
      return {
        parents: createdCategories,
        children: subCategories,
        total: createdCategories.length + subCategories.length,
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `${results.total} kategori berhasil dibuat (${results.parents.length} parent + ${results.children.length} sub-kategori)`,
      data: results,
    })
    
  } catch (error) {
    console.error('Seed with sub-categories error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat kategori dengan sub-kategori' }, 
      { status: 500 }
    )
  }
}
