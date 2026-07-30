import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Test connection
    const kategori = await db.kategori.findMany()
    const aset = await db.aset.findMany()
    return NextResponse.json({
      status: 'OK',
      kategori_count: kategori.length,
      aset_count: aset.length,
    })
  } catch (err: any) {
    return NextResponse.json({
      status: 'ERROR',
      message: err.message,
      code: err.code,
      meta: err.meta,
    }, { status: 500 })
  }
}
