// packages/shared/src/shutdown.js

/**
 * Setup standard graceful shutdown handlers.
 *
 * @param {Object} options
 * @param {import('pino').Logger} options.logger
 * @param {string} options.name - Human-readable app name for logs.
 * @param {() => Promise<void> | void} [options.cleanup] - Called once on shutdown.
 */
export function setupGracefulShutdown({ logger, name, cleanup = async () => {} }) {
    let shuttingDown = false

    const shutdown = async (signal, exitCode = 0) => {
        if (shuttingDown) return
        shuttingDown = true

        logger.info({ signal }, `Shutting down ${name}`)

        try {
            await cleanup()
        } catch (error) {
            logger.error({ err: error }, `Error during ${name} shutdown`)
        }

        logger.info(`${name} shutdown complete`)
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

    return shutdown
}
