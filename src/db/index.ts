import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

const NEON_CONNECTION_STRING = 
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_M9fLlxUO4NTi@ep-summer-butterfly-b2v4rkg4-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require';

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      connectionString: NEON_CONNECTION_STRING,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle Neon SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
export { pool };

