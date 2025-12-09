import dotenv from 'dotenv'

dotenv.config()

function buildStreamId(env) {
    if (env.STREAMR_STREAM_ID) {
        return env.STREAMR_STREAM_ID
    }

    if (env.STREAMR_ETH_ACCOUNT && env.STREAM_ID) {
        return `${env.STREAMR_ETH_ACCOUNT}/${env.STREAM_ID}`
    }

    throw new Error('Missing stream identifier: set STREAMR_STREAM_ID or both STREAMR_ETH_ACCOUNT and STREAM_ID')
}

export function loadConfig(env = process.env) {
    const privateKey = env.STREAMR_PRIVATE_KEY
    if (!privateKey) {
        throw new Error('STREAMR_PRIVATE_KEY is required')
    }

    const streamId = buildStreamId(env)

    const port = env.WEBSOCKET_PORT ? Number.parseInt(env.WEBSOCKET_PORT, 10) : 8080
    if (!Number.isInteger(port) || port <= 0) {
        throw new Error('WEBSOCKET_PORT must be a positive integer')
    }

    const logLevel = env.LOG_LEVEL ?? 'info'

    return {
        privateKey,
        streamId,
        port,
        logLevel
    }
}
