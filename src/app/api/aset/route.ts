import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { namaAset, jenisGrup, pemilik, visibilitas, saldoAwal, icon, mataUang } = body

    if (!namaAset || !jenisGrup) {
      return NextResponse.json({ error: 'namaAset dan jenisGrup wajib diisi' }, { status: 400 })
    }

    const aset = await db.aset.create({
      data: {
        namaAset,
        jenisGrup,
        pemilik: pemilik || 'Bersama',
        visibilitas: visibilitas || 'Bersama',
        saldoAwal: parseFloat(saldoAwal) || 0,
        saldoBerjalan: parseFloat(saldoAwal) || 0,
        icon: icon || '💰',
        mataUang: mataUang || 'IDR',
      },
    })
    return NextResponse.json(aset, { status: 201 })
  } catch (error) {
    console.error('Create aset error:', error)
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
  }
}
