import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import type { PoolConfig } from "pg"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize the database")
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback
  }

  const normalized = value.trim().toLowerCase()

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false
  }

  return fallback
}

function parseInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const globalForDb = globalThis as typeof globalThis & {
  __batwaraPool?: Pool
}

const enableDbSsl = parseBoolean(process.env.DB_SSL, false)
const rejectUnauthorized = parseBoolean(
  process.env.DB_SSL_REJECT_UNAUTHORIZED,
  true
)

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  max: parseInteger(process.env.DB_POOL_MAX, 10),
  idleTimeoutMillis: parseInteger(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
  connectionTimeoutMillis: parseInteger(
    process.env.DB_CONNECTION_TIMEOUT_MS,
    10_000
  ),
}

if (enableDbSsl) {
  poolConfig.ssl = { rejectUnauthorized }
}

const existingPool = globalForDb.__batwaraPool
const pool = existingPool ?? new Pool(poolConfig)

if (process.env.NODE_ENV !== "production") {
  globalForDb.__batwaraPool = pool
}

if (!existingPool) {
  pool.on("error", (error) => {
    console.error("[Batwara DB] Unexpected idle client error", error)
  })
}

export const db = drizzle(pool)
