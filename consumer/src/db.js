// consumer/src/db.js
import { Pool } from 'pg'

/**
 * Create a Postgres connection pool.
 *
 * @param {string} connectionString
 * @param {import('pino').Logger} logger
 */
export function createDbPool(connectionString, logger) {
    if (!connectionString) {
        throw new Error('connectionString is required to create DB pool')
    }

    const pool = new Pool({
        connectionString,
        // tune as needed
        max: 10,
    })

    pool.on('error', (err) => {
        logger.error({ err }, 'Unexpected error on idle Postgres client')
    })

    return pool
}
