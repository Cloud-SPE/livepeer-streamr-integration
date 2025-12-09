// packages/shared/src/logger.js
import pino from 'pino'

export function createLogger(level = 'info') {
    return pino({
        level,
    })
}
