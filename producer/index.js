// producer/index.js
import { loadConfig } from './src/config.js'
import {
    createLogger,
    createStreamrClient,
    setupGracefulShutdown,
} from '@livepeer-streamr/shared'
import { startWebSocketStreamServer } from './src/server.js'

async function main() {
    const config = loadConfig()
    const logger = createLogger(config.logLevel)

    logger.info(
        { streamId: config.streamId, port: config.port },
        'Starting Streamr WebSocket bridge',
    )

    const streamrClient = createStreamrClient(config.privateKey)

    const { stop } = await startWebSocketStreamServer({
        streamrClient,
        streamId: config.streamId,
        logger,
        port: config.port,
    })

    setupGracefulShutdown({
        logger,
        name: 'Streamr WebSocket bridge',
        cleanup: async () => {
            try {
                await stop()
            } catch (error) {
                logger.error({ err: error }, 'Error while stopping WebSocket server')
            }

            try {
                if (typeof streamrClient.destroy === 'function') {
                    await streamrClient.destroy()
                    logger.info('Streamr producer destroyed')
                }
            } catch (error) {
                logger.error({ err: error }, 'Error while destroying Streamr producer')
            }
        },
    })
}

main().catch((error) => {
    const logger = createLogger(process.env.LOG_LEVEL ?? 'error')
    logger.fatal({ err: error }, 'Failed to start Streamr WebSocket bridge')
    process.exit(1)
})
