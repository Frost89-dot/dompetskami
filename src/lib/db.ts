import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // ✅ Pakai TURSO_DATABASE_URL sebagai primary, DATABASE_URL sebagai fallback
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL || ''

  if (!dbUrl) {
    throw new Error('Database URL is not defined. Set TURSO_DATABASE_URL or DATABASE_URL.')
  }

  if (dbUrl.startsWith('libsql://')) {
    const libsql: Client = createClient({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  return new PrismaClient({ datasourceUrl: dbUrl })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
