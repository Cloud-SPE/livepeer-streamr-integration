// consumer/src/eventLogRepository.js

/**
 * @typedef {Object} EventLogRecord
 * @property {string} streamId
 * @property {number|Date} msgTimestamp
 * @property {number|null} streamPartition
 * @property {number|null} sequenceNumber
 * @property {string|null} publisherId
 * @property {string|null} msgChainId
 * @property {unknown} payload
 */

/**
 * @param {import('pg').Pool} pool
 * @param {import('pino').Logger} logger
 */
export function createEventLogRepository(pool, logger) {
    const ensureSchema = async () => {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS stream_event_log (
        id BIGSERIAL PRIMARY KEY,
        stream_id TEXT NOT NULL,
        msg_timestamp TIMESTAMPTZ NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        stream_partition INTEGER,
        sequence_number BIGINT,
        publisher_id TEXT,
        msg_chain_id TEXT,
        payload JSONB NOT NULL
      );
    `)

        await pool.query(`
      CREATE INDEX IF NOT EXISTS stream_event_log_stream_ts_idx
      ON stream_event_log (stream_id, msg_timestamp);
    `)

        logger.info('Ensured stream_event_log table exists')
    }

    /**
     * @param {EventLogRecord} event
     */
    const insertEvent = async ({
                                   streamId,
                                   msgTimestamp,
                                   streamPartition,
                                   sequenceNumber,
                                   publisherId,
                                   msgChainId,
                                   payload,
                               }) => {
            let jsonText

            try {
                // We know payload is a JS object/array here -> turn it into valid JSON text.
                jsonText = JSON.stringify(payload)
            } catch (err) {
                // Worst-case fallback: store a stringified version so we don't lose the event entirely.
                logger.error({ err, payload }, 'Failed to JSON.stringify payload, storing as string')
                jsonText = JSON.stringify(String(payload))
            }

            await pool.query(
                `
                    INSERT INTO stream_event_log (
                        stream_id,
                        msg_timestamp,
                        stream_partition,
                        sequence_number,
                        publisher_id,
                        msg_chain_id,
                        payload
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `,
                [
                    streamId,
                    msgTimestamp instanceof Date ? msgTimestamp : new Date(msgTimestamp),
                    streamPartition,
                    sequenceNumber,
                    publisherId,
                    msgChainId,
                    jsonText,        // <--- controlled JSON string
                ],
            )
        }


    const close = async () => {
        await pool.end()
    }

    return {
        ensureSchema,
        insertEvent,
        close,
    }
}
