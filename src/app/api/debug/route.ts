import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.DATABASE_URL!
  const token = process.env.TURSO_AUTH_TOKEN!

  try {
    const { createClient } = await import('@libsql/client')
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const { PrismaClient } = await import('@prisma/client')

    const client = createClient({ url, authToken: token })
    const adapter = new PrismaLibSQL(client)
    const prisma = new PrismaClient({ adapter })

    const count = await prisma.kategori.count()
    return NextResponse.json({ status: 'OK', kategori_count: count })
  } catch (err: any) {
    return NextResponse.json({
      status: 'ERROR',
      message: err.message?.substring(0, 300),
      code: err.code,
    }, { status: 500 })
  }
}
