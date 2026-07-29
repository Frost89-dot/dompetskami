import { db } from '../src/lib/db'

async function main() {
  // Create users
  const suami = await db.user.create({
    data: {
      nama: 'Suami',
      email: 'suami@dompetkami.com',
      role: 'admin',
      warnaTema: '#2563EB',
    },
  })

  const istri = await db.user.create({
    data: {
      nama: 'Istri',
      email: 'istri@dompetkami.com',
      role: 'co-admin',
      warnaTema: '#EC4899',
    },
  })

  // Create assets
  const kasRumah = await db.aset.create({
    data: { namaAset: 'Kas Rumah', jenisGrup: 'Kas', pemilik: 'Bersama', saldoAwal: 500000, saldoBerjalan: 750000, icon: '💵' },
  })
  const bcaSuami = await db.aset.create({
    data: { namaAset: 'BCA Suami', jenisGrup: 'Akun', pemilik: 'Suami', saldoAwal: 5000000, saldoBerjalan: 8200000, icon: '🏦' },
  })
  const mandiriIstri = await db.aset.create({
    data: { namaAset: 'Mandiri Istri', jenisGrup: 'Akun', pemilik: 'Istri', saldoAwal: 3000000, saldoBerjalan: 4100000, icon: '🏦' },
  })
  const bniTab = await db.aset.create({
    data: { namaAset: 'BNI Tabungan', jenisGrup: 'Tabungan', pemilik: 'Bersama', saldoAwal: 10000000, saldoBerjalan: 12500000, icon: '🐷' },
  })
  const ccBca = await db.aset.create({
    data: { namaAset: 'CC BCA', jenisGrup: 'Kartu Kredit', pemilik: 'Bersama', saldoAwal: 0, saldoBerjalan: -1500000, icon: '💳' },
  })
  const gopay = await db.aset.create({
    data: { namaAset: 'GoPay', jenisGrup: 'Top-up/Prabayar', pemilik: 'Bersama', saldoAwal: 200000, saldoBerjalan: 350000, icon: '📱' },
  })
  const reksadana = await db.aset.create({
    data: { namaAset: 'Reksadana Syariah', jenisGrup: 'Investasi', pemilik: 'Bersama', saldoAwal: 15000000, saldoBerjalan: 17200000, icon: '📈' },
  })

  // Create categories
  const categories = [
    { namaKategori: 'Gaji', tipe: 'Pemasukan', icon: '💰', warna: '#10B981' },
    { namaKategori: 'Freelance', tipe: 'Pemasukan', icon: '💻', warna: '#06B6D4' },
    { namaKategori: 'Bonus', tipe: 'Pemasukan', icon: '🎁', warna: '#8B5CF6' },
    { namaKategori: 'Makanan & Minuman', tipe: 'Pengeluaran', icon: '🍔', warna: '#F59E0B' },
    { namaKategori: 'Transportasi', tipe: 'Pengeluaran', icon: '🚗', warna: '#EF4444' },
    { namaKategori: 'Belanja', tipe: 'Pengeluaran', icon: '🛒', warna: '#EC4899' },
    { namaKategori: 'Tagihan & Utilitas', tipe: 'Pengeluaran', icon: '⚡', warna: '#6366F1' },
    { namaKategori: 'Kesehatan', tipe: 'Pengeluaran', icon: '🏥', warna: '#14B8A6' },
    { namaKategori: 'Hiburan', tipe: 'Pengeluaran', icon: '🎬', warna: '#F97316' },
    { namaKategori: 'Pendidikan', tipe: 'Pengeluaran', icon: '📚', warna: '#3B82F6' },
    { namaKategori: 'Tabungan & Investasi', tipe: 'Pengeluaran', icon: '🏦', warna: '#22C55E' },
    { namaKategori: 'Lainnya', tipe: 'Pengeluaran', icon: '📦', warna: '#6B7280' },
  ]

  const createdCategories: Record<string, string> = {}
  for (const cat of categories) {
    const created = await db.kategori.create({ data: cat })
    createdCategories[cat.namaKategori] = created.id
  }

  // Create sample transactions for current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const sampleTransactions = [
    { tanggalWaktu: new Date(year, month, 1, 8, 0), tipe: 'Pemasukan', asetId: bcaSuami.id, kategoriId: createdCategories['Gaji'], nominal: 12000000, deskripsi: 'Gaji Bulanan Suami', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 1, 9, 0), tipe: 'Pemasukan', asetId: mandiriIstri.id, kategoriId: createdCategories['Gaji'], nominal: 8000000, deskripsi: 'Gaji Bulanan Istri', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month, 2, 12, 30), tipe: 'Pengeluaran', asetId: kasRumah.id, kategoriId: createdCategories['Makanan & Minuman'], nominal: 85000, deskripsi: 'Belanja sayur di pasar', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month, 2, 19, 0), tipe: 'Pengeluaran', asetId: gopay.id, kategoriId: createdCategories['Transportasi'], nominal: 45000, deskripsi: 'Grab ke kantor', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 3, 7, 30), tipe: 'Pengeluaran', asetId: kasRumah.id, kategoriId: createdCategories['Makanan & Minuman'], nominal: 25000, deskripsi: 'Sarapan di warung', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 3, 15, 0), tipe: 'Pengeluaran', asetId: bcaSuami.id, kategoriId: createdCategories['Tagihan & Utilitas'], nominal: 650000, deskripsi: 'Listrik & Air bulan ini', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 4, 10, 0), tipe: 'Pengeluaran', asetId: mandiriIstri.id, kategoriId: createdCategories['Belanja'], nominal: 350000, deskripsi: 'Beli baju anak', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month, 4, 20, 0), tipe: 'Pengeluaran', asetId: ccBca.id, kategoriId: createdCategories['Belanja'], nominal: 275000, deskripsi: 'Belanja Tokopedia', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month, 5, 8, 0), tipe: 'Pengeluaran', asetId: kasRumah.id, kategoriId: createdCategories['Makanan & Minuman'], nominal: 50000, deskripsi: 'Makan siang kantin', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 5, 14, 0), tipe: 'Pengeluaran', asetId: gopay.id, kategoriId: createdCategories['Transportasi'], nominal: 32000, deskripsi: 'Ojol ke supermarket', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month, 6, 9, 0), tipe: 'Pengeluaran', asetId: bcaSuami.id, kategoriId: createdCategories['Kesehatan'], nominal: 150000, deskripsi: 'Obat di apotek', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 7, 11, 0), tipe: 'Pengeluaran', asetId: mandiriIstri.id, kategoriId: createdCategories['Hiburan'], nominal: 120000, deskripsi: 'Nonton bioskop', dicatatOleh: istri.id, isBookmark: true },
    { tanggalWaktu: new Date(year, month, 8, 16, 0), tipe: 'Pengeluaran', asetId: kasRumah.id, kategoriId: createdCategories['Makanan & Minuman'], nominal: 200000, deskripsi: 'Belanja bulanan di supermarket', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month, 9, 8, 0), tipe: 'Pemasukan', asetId: bcaSuami.id, kategoriId: createdCategories['Freelance'], nominal: 2500000, deskripsi: 'Proyek freelance website', dicatatOleh: suami.id, isBookmark: true },
    { tanggalWaktu: new Date(year, month, 10, 13, 0), tipe: 'Pengeluaran', asetId: gopay.id, kategoriId: createdCategories['Makanan & Minuman'], nominal: 75000, deskripsi: 'Kopi & snack meeting', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 10, 18, 0), tipe: 'Pengeluaran', asetId: ccBca.id, kategoriId: createdCategories['Pendidikan'], nominal: 450000, deskripsi: 'Kursus online bahasa Inggris', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 11, 7, 0), tipe: 'Pengeluaran', asetId: kasRumah.id, kategoriId: createdCategories['Makanan & Minuman'], nominal: 30000, deskripsi: 'Sarapan bakso', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month, 12, 10, 0), tipe: 'Pengeluaran', asetId: bcaSuami.id, kategoriId: createdCategories['Tabungan & Investasi'], nominal: 2000000, deskripsi: 'Setoran Reksadana bulanan', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month, 13, 15, 30), tipe: 'Pengeluaran', asetId: mandiriIstri.id, kategoriId: createdCategories['Belanja'], nominal: 180000, deskripsi: 'Kebutuhan rumah tangga', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month, 14, 19, 0), tipe: 'Pengeluaran', asetId: kasRumah.id, kategoriId: createdCategories['Makanan & Minuman'], nominal: 95000, deskripsi: 'Makan malam di restoran', dicatatOleh: suami.id, isBookmark: true },
    // Some transactions from last month
    { tanggalWaktu: new Date(year, month - 1, 1, 8, 0), tipe: 'Pemasukan', asetId: bcaSuami.id, kategoriId: createdCategories['Gaji'], nominal: 12000000, deskripsi: 'Gaji Bulanan Suami', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month - 1, 1, 9, 0), tipe: 'Pemasukan', asetId: mandiriIstri.id, kategoriId: createdCategories['Gaji'], nominal: 8000000, deskripsi: 'Gaji Bulanan Istri', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month - 1, 5, 12, 0), tipe: 'Pengeluaran', asetId: kasRumah.id, kategoriId: createdCategories['Makanan & Minuman'], nominal: 300000, deskripsi: 'Belanja bulanan', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month - 1, 10, 15, 0), tipe: 'Pengeluaran', asetId: bcaSuami.id, kategoriId: createdCategories['Tagihan & Utilitas'], nominal: 600000, deskripsi: 'Listrik bulan lalu', dicatatOleh: suami.id },
    { tanggalWaktu: new Date(year, month - 1, 15, 8, 0), tipe: 'Pengeluaran', asetId: mandiriIstri.id, kategoriId: createdCategories['Kesehatan'], nominal: 200000, deskripsi: 'Cek kesehatan', dicatatOleh: istri.id },
    { tanggalWaktu: new Date(year, month - 1, 20, 10, 0), tipe: 'Pengeluaran', asetId: ccBca.id, kategoriId: createdCategories['Belanja'], nominal: 500000, deskripsi: 'Elektronik', dicatatOleh: suami.id },
  ]

  for (const tx of sampleTransactions) {
    await db.transaksi.create({
      data: {
        ...tx,
        isBookmark: (tx as any).isBookmark || false,
      },
    })
  }

  // Create targets
  await db.target.create({
    data: {
      namaTarget: 'Dana Darurat',
      jenisTarget: 'Tabungan',
      nominalTarget: 50000000,
      nominalTerkumpul: 12500000,
      asetTerkaitId: bniTab.id,
      tanggalMulai: new Date(year, 0, 1),
      tanggalTarget: new Date(year + 1, 11, 31),
      pemilik: 'Bersama',
      status: 'Aktif',
      userId: suami.id,
    },
  })

  await db.target.create({
    data: {
      namaTarget: 'Liburan Bali',
      jenisTarget: 'Tabungan',
      nominalTarget: 15000000,
      nominalTerkumpul: 4500000,
      asetTerkaitId: bcaSuami.id,
      tanggalMulai: new Date(year, 2, 1),
      tanggalTarget: new Date(year, 11, 15),
      pemilik: 'Bersama',
      status: 'Aktif',
      userId: istri.id,
    },
  })

  await db.target.create({
    data: {
      namaTarget: 'Kursus Istri',
      jenisTarget: 'Tabungan',
      nominalTarget: 5000000,
      nominalTerkumpul: 3200000,
      asetTerkaitId: mandiriIstri.id,
      tanggalMulai: new Date(year, 1, 1),
      tanggalTarget: new Date(year, 8, 30),
      pemilik: 'Istri',
      status: 'Aktif',
      userId: istri.id,
    },
  })

  // Create budgets for current month
  const periode = `${year}-${String(month + 1).padStart(2, '0')}`
  const budgetItems = [
    { kategoriId: createdCategories['Makanan & Minuman'], nominalAnggaran: 3000000 },
    { kategoriId: createdCategories['Transportasi'], nominalAnggaran: 1000000 },
    { kategoriId: createdCategories['Belanja'], nominalAnggaran: 2000000 },
    { kategoriId: createdCategories['Hiburan'], nominalAnggaran: 500000 },
    { kategoriId: createdCategories['Tagihan & Utilitas'], nominalAnggaran: 1500000 },
    { kategoriId: createdCategories['Kesehatan'], nominalAnggaran: 500000 },
    { kategoriId: createdCategories['Pendidikan'], nominalAnggaran: 1000000 },
  ]

  for (const b of budgetItems) {
    // Calculate spent amount for current month
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 1)
    const spent = await db.transaksi.aggregate({
      _sum: { nominal: true },
      where: {
        kategoriId: b.kategoriId,
        tipe: 'Pengeluaran',
        isAdjustment: false,
        tanggalWaktu: { gte: monthStart, lt: monthEnd },
      },
    })
    await db.anggaran.create({
      data: {
        periode,
        ...b,
        nominalTerpakai: spent._sum.nominal || 0,
        dibuatOleh: suami.id,
      },
    })
  }

  // Create memos
  await db.memo.create({
    data: {
      judul: 'Utang ke Bu Wati',
      isi: 'Beli nasi goreng 3x belum dibayar. Total Rp 45.000. Bayar saat gajian.',
      tag: 'utang',
      pinned: true,
      dibuatOleh: istri.id,
    },
  })
  await db.memo.create({
    data: {
      judul: 'Ide Bisnis Sampingan',
      isi: 'Jualan kue online di weekend. Modal awal sekitar 500rb untuk bahan dan packaging.',
      tag: 'ide',
      pinned: false,
      dibuatOleh: suami.id,
    },
  })
  await db.memo.create({
    data: {
      judul: 'Renovasi Kamar Mandi',
      isi: 'Estimasi biaya 8-12 juta. Tunggu bonus akhir tahun. Cari referensi desain dulu.',
      tag: 'rencana',
      pinned: true,
      dibuatOleh: suami.id,
    },
  })

  console.log('✅ Seed data berhasil dibuat!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
