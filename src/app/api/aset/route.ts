import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const GRUP_ORDER = ['Kas', 'Akun', 'Tabungan', 'Kartu Kredit', 'Top-up/Prabayar', 'Investasi', 'Pinjaman', 'Asuransi']

export async function GET() {
  try {
    const asets = await db.aset.findMany({
      where: { statusAktif: true },
      orderBy: { createdAt: 'asc' },
    })
    const grouped: Record<string, typeof asets> = {}
    for (const g of GRUP_ORDER) grouped[g] = []
    for (const a of asets) {
      if (!grouped[a.jenisGrup]) grouped[a.jenisGrup] = []
      grouped[a.jenisGrup].push(a)
    }
    return NextResponse.json({ grouped, all: asets })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 })
  }
}
