// consumer/index.js
import { loadConfig } from './src/config.js'
import { createDbPool } from './src/db.js'
import { createEventLogRepository } from './src/eventLogRepository.js'
import {
    createLogger,
    createStreamrClient,
    setupGracefulShutdown,
} from '@livepeer-streamr/shared'
import { startStreamConsumer } from './src/streamConsumer.js'

async function main() {
    const config = loadConfig()
    const logger = createLogger(config.logLevel)

    logger.info(
        { streamId: config.streamId, databaseUrl: config.databaseUrl },
        'Starting Streamr Consumer',
    )

    const streamrClient = createStreamrClient(config.privateKey)
    const pool = createDbPool(config.databaseUrl, logger)
    const eventLogRepository = createEventLogRepository(pool, logger)

    const { stop } = await startStreamConsumer({
        streamrClient,
        streamId: config.streamId,
        logger,
        eventLogRepository,
    })

    setupGracefulShutdown({
        logger,
        name: 'Streamr Consumer',
        cleanup: async () => {
            try {
                await stop()
            } catch (err) {
                logger.error({ err }, 'Error while stopping Streamr consumer')
            }

            try {
                if (typeof streamrClient.destroy === 'function') {
                    await streamrClient.destroy()
                    logger.info('Streamr client destroyed')
                }
            } catch (err) {
                logger.error({ err }, 'Error while destroying Streamr client')
            }
        },
    })
}

main().catch((error) => {
    const logger = createLogger(process.env.LOG_LEVEL ?? 'error')
    logger.fatal({ err: error }, 'Failed to start Streamr Consumer')
    process.exit(1)
})
