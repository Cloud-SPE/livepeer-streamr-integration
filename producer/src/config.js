import { loadBaseConfig } from '@livepeer-streamr/shared'

export function loadConfig(env = process.env) {
    const base = loadBaseConfig(env)

    const port = env.WEBSOCKET_PORT ? Number.parseInt(env.WEBSOCKET_PORT, 10) : 8080
    if (!Number.isInteger(port) || port <= 0) {
        throw new Error('WEBSOCKET_PORT must be a positive integer')
    }

    return {
        ...base,
        port,
    }
}
