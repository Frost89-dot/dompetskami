import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL || 'UNDEFINED',
    DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'UNDEFINED',
    TURSO_AUTH_TOKEN_length: process.env.TURSO_AUTH_TOKEN?.length || 0,
    all_env_keys: Object.keys(process.env).filter(k => 
      k.includes('DATABASE') || k.includes('TURSO') || k.includes('LIBSQL')
    ),
  })
}
