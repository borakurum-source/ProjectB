import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export async function query<T = any>(text: string, values?: any[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, values);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(text: string, values?: any[]): Promise<T | null> {
  const results = await query<T>(text, values);
  return results[0] || null;
}

export async function execute(text: string, values?: any[]): Promise<number> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, values);
    return result.rowCount || 0;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
