import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET'
  const token = process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT SET'
  const nodeEnv = process.env.NODE_ENV || 'NOT SET'

  return NextResponse.json({
    database_url: dbUrl.startsWith('libsql') ? 'OK (libsql)' : dbUrl,
    turso_token: token,
    node_env: nodeEnv,
  })
}
