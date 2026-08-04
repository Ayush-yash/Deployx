import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let activePort = 5433;
const primaryConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/deployx';
const fallbackConnectionString = 'postgresql://postgres:postgres@localhost:5432/deployx';

function createPrismaClient(connectionString: string) {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000, // 5s timeout
    max: 20
  });
  const adapter = new PrismaPg(pool);
  return { prisma: new PrismaClient({ adapter }), pool };
}

let { prisma: prismaClient, pool: activePool } = createPrismaClient(primaryConnectionString);

/**
 * Ensures Docker PostgreSQL container is started if DB connection was refused.
 */
export async function ensureDatabaseRunning(): Promise<boolean> {
  console.log('[DB Health] Checking database connectivity...');
  try {
    // Quick probe query
    await prismaClient.$queryRaw`SELECT 1`;
    console.log('[DB Health] Database is healthy and responsive!');
    return true;
  } catch (error: any) {
    console.warn('[DB Health] Database connection failed or refused. Attempting auto-healing...');

    // Try fallback port 5432 first
    try {
      console.log('[DB Health] Testing fallback connection on port 5432...');
      const fallback = createPrismaClient(fallbackConnectionString);
      await fallback.prisma.$queryRaw`SELECT 1`;
      console.log('[DB Health] Successfully connected via fallback port 5432!');
      prismaClient = fallback.prisma;
      activePool = fallback.pool;
      return true;
    } catch (e) {
      console.log('[DB Health] Fallback port 5432 unreachable.');
    }

    // Try starting Docker Desktop and Postgres container automatically
    try {
      console.log('[DB Health] Triggering Docker postgres container start...');
      await execAsync('docker-compose up -d postgres');
      // Wait 3s for postgres to initialize
      await new Promise(r => setTimeout(r, 3000));
      
      const retry = createPrismaClient(primaryConnectionString);
      await retry.prisma.$queryRaw`SELECT 1`;
      console.log('[DB Health] Auto-healing successful! Postgres container is now ready.');
      prismaClient = retry.prisma;
      activePool = retry.pool;
      return true;
    } catch (startErr: any) {
      console.error('[DB Health] Failed to auto-start Postgres container:', startErr.message);
      return false;
    }
  }
}

// Proxy object to automatically forward all Prisma calls to the active prisma instance
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const instance = prismaClient as any;
    if (typeof instance[prop] === 'function') {
      return async (...args: any[]) => {
        try {
          return await instance[prop](...args);
        } catch (err: any) {
          // If connection error (ECONNREFUSED / P1000), attempt heal & retry once
          if (err?.code === 'P1000' || err?.message?.includes('ECONNREFUSED') || err?.message?.includes('Connection terminated')) {
            console.warn(`[Prisma Proxy] Database query failed on ${String(prop)}. Retrying with DB auto-heal...`);
            const healed = await ensureDatabaseRunning();
            if (healed) {
              return await (prismaClient as any)[prop](...args);
            }
          }
          throw err;
        }
      };
    }
    return instance[prop];
  }
});

export default prisma;
