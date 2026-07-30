import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''

  try {
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const { createClient } = await import('@libsql/client')
    const { PrismaClient } = await import('@prisma/client')

    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
    const adapter = new PrismaLibSQL(libsql)
    const client = new PrismaClient({ adapter })

    const kategori = await client.kategori.findMany()

    return NextResponse.json({
      status: 'OK',
      dbUrl_prefix: dbUrl.substring(0, 20),
      kategori_count: kategori.length,
    })
  } catch (err: any) {
    return NextResponse.json({
      status: 'ERROR',
      message: err.message,
      dbUrl_value: dbUrl,
      dbUrl_type: typeof dbUrl,
    }, { status: 500 })
  }
}
