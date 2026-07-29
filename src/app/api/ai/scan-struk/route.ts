import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

const zai = new ZAI({})

export async function POST(req: NextRequest) {
  try {
    const { image, dicatatOleh, asetId } = await req.json()

    const result = await zai.chat.completions.createVision({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Kamu adalah OCR untuk struk belanja Indonesia. Ekstrak data dari struk ini dan kembalikan dalam format JSON:
{
  "namaToko": "...",
  "tanggal": "YYYY-MM-DD",
  "items": [{"nama": "...", "jumlah": 0, "harga": 0}],
  "total": 0,
  "kategori": "Makanan & Minuman" | "Belanja" | "Transportasi" | "Lainnya"
}
Hanya kembalikan JSON, tanpa penjelasan tambahan.` },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
        ],
      }],
    })

    const text = result.choices?.[0]?.message?.content || ''
    let extracted
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : text)
    } catch {
      extracted = { namaToko: '', tanggal: '', items: [], total: 0, kategori: 'Lainnya' }
    }

    const confidence = extracted.total > 0 ? 0.85 : 0.4

    await db.aiLog.create({
      data: {
        jenisProses: 'scan_struk',
        inputRingkas: `Image scan by ${dicatatOleh}`,
        outputJson: JSON.stringify(extracted),
        confidenceScore: confidence,
        status: confidence >= 0.7 ? 'success' : 'review',
      },
    })

    if (confidence >= 0.7) {
      const tx = await db.transaksi.create({
        data: {
          tanggalWaktu: extracted.tanggal ? new Date(extracted.tanggal) : new Date(),
          tipe: 'Pengeluaran',
          asetId: asetId,
          kategoriId: null,
          nominal: extracted.total,
          deskripsi: extracted.namaToko || 'Scan Struk AI',
          catatan: extracted.items?.map((i: any) => i.nama).join(', ') || '',
          sumberInput: 'AI',
          statusReview: 'Terverifikasi',
          dicatatOleh,
        },
        include: { aset: true, kategori: true, user: true },
      })
      await db.aset.update({
        where: { id: asetId },
        data: { saldoBerjalan: { decrement: extracted.total } },
      })
      return NextResponse.json({ extracted, confidence, status: 'auto_saved', transaction: tx })
    }

    return NextResponse.json({ extracted, confidence, status: 'needs_review' })
  } catch (error) {
    console.error('AI scan error:', error)
    return NextResponse.json({ error: 'AI scan failed', extracted: null, confidence: 0, status: 'failed' }, { status: 500 })
  }
}