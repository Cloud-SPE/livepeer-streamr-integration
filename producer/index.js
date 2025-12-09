import { StreamrClient } from '@streamr/sdk'
import { loadConfig } from './src/config.js'
import { createLogger } from './src/logger.js'
import { startWebSocketStreamServer } from './src/server.js'

async function main() {
    const config = loadConfig()
    const logger = createLogger(config.logLevel)

    logger.info(
        { streamId: config.streamId, port: config.port },
        'Starting Streamr WebSocket bridge',
    )

    const streamrClient = new StreamrClient({
        auth: {
            privateKey: config.privateKey,
        },
    })

    const { stop } = await startWebSocketStreamServer({
        streamrClient,
        streamId: config.streamId,
        logger,
        port: config.port,
    })

    let shuttingDown = false

    const shutdown = async (signal, exitCode = 0) => {
        if (shuttingDown) {
            return
        }
        shuttingDown = true

        logger.info({ signal }, 'Shutting down Streamr WebSocket bridge')

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

        logger.info('Shutdown complete')
        process.exit(exitCode)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    process.on('uncaughtException', (error) => {
        logger.fatal({ err: error }, 'Uncaught exception')
        shutdown('uncaughtException', 1)
    })

    process.on('unhandledRejection', (reason) => {
        logger.fatal({ err: reason }, 'Unhandled promise rejection')
        shutdown('unhandledRejection', 1)
    })
}

main().catch((error) => {
    const logger = createLogger(process.env.LOG_LEVEL ?? 'error')
    logger.fatal({ err: error }, 'Failed to start Streamr WebSocket bridge')
    process.exit(1)
})
