import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

const zai = new ZAI({})

export async function GET() {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const [txs, budgets, assets] = await Promise.all([
      db.transaksi.findMany({
        where: { tanggalWaktu: { gte: monthStart, lte: monthEnd }, isAdjustment: false },
        include: { kategori: true },
      }),
      db.anggaran.findMany({
        where: { periode: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` },
        include: { kategori: true },
      }),
      db.aset.findMany({ where: { statusAktif: true } }),
    ])

    const totalIncome = txs.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0)
    const totalExpense = txs.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0)
    const netWorth = assets.reduce((s, a) => s + a.saldoBerjalan, 0)

    const catExpenses: Record<string, number> = {}
    for (const tx of txs.filter(t => t.tipe === 'Pengeluaran' && t.kategori)) {
      catExpenses[tx.kategori!.namaKategori] = (catExpenses[tx.kategori!.namaKategori] || 0) + tx.nominal
    }
    const topCats = Object.entries(catExpenses).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const budgetStatus = budgets.map(b => ({
      kategori: b.kategori?.namaKategori,
      anggaran: b.nominalAnggaran,
      terpakai: b.nominalTerpakai,
      persen: b.nominalAnggaran > 0 ? Math.round((b.nominalTerpakai / b.nominalAnggaran) * 100) : 0,
    }))

    const dataSummary = JSON.stringify({
      bulan: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      totalPemasukan: totalIncome,
      totalPengeluaran: totalExpense,
      sisa: totalIncome - totalExpense,
      netWorth,
      topKategoriPengeluaran: topCats,
      statusAnggaran: budgetStatus,
      jumlahTransaksi: txs.length,
    })

    const result = await zai.chat.completions.create({
      messages: [{
        role: 'user',
        content: `Kamu adalah analis keuangan rumah tangga. Berikan insight singkat (3-5 paragraf dalam Bahasa Indonesia) berdasarkan data keuangan bulan ini. Fokus pada: 1) Ringkasan kondisi keuangan, 2) Kategori pengeluaran terbesar dan rekomendasi, 3) Status anggaran dan peringatan jika ada yang over-budget, 4) Tips untuk bulan depan.

Data:
${dataSummary}

Berikan respons dalam format yang mudah dibaca dengan emoji. Jangan gunakan markdown heading.`,
      }],
    })

    const insight = result.choices?.[0]?.message?.content || 'Tidak dapat menghasilkan insight saat ini.'

    await db.aiLog.create({
      data: {
        jenisProses: 'insight',
        inputRingkas: dataSummary.substring(0, 500),
        outputJson: insight,
        status: 'success',
      },
    })

    return NextResponse.json({ insight })
  } catch (error) {
    console.error('AI insight error:', error)
    return NextResponse.json({
      insight: '📊 Insight AI sedang tidak tersedia. Silakan coba lagi nanti.',
      fallback: true,
    })
  }
}