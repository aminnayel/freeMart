import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

// Configure Neon for WebSocket support
neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is provided
const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: Pool | null = null;

/**
 * Get the database instance.
 * Returns null if DATABASE_URL is not configured (will use MemStorage instead).
 */
export function getDb() {
    if (!DATABASE_URL) {
        return null;
    }

    if (!db) {
        pool = new Pool({ connectionString: DATABASE_URL });
        db = drizzle(pool, { schema });
        console.log('✅ Database connection established');
    }

    return db;
}

/**
 * Get the connection pool for session storage.
 */
export function getPool() {
    if (!DATABASE_URL) {
        return null;
    }

    if (!pool) {
        pool = new Pool({ connectionString: DATABASE_URL });
    }

    return pool;
}

/**
 * Check if database is available.
 */
export function isDatabaseAvailable(): boolean {
    return !!DATABASE_URL;
}

/**
 * Close database connections gracefully.
 */
export async function closeDb() {
    if (pool) {
        await pool.end();
        pool = null;
        db = null;
        console.log('Database connection closed');
    }
}

// Export for backward compatibility
export { db, pool };
