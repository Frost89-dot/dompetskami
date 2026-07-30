import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL

  // If DATABASE_URL is a libsql URL, use the adapter
  if (dbUrl?.startsWith('libsql://')) {
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')
    const { createClient } = require('@libsql/client')

    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter, datasourceUrl: dbUrl })
  }

  // Fallback for local SQLite or any other URL
  return new PrismaClient({ datasourceUrl: dbUrl })
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
