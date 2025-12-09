// packages/shared/src/config.js
import dotenv from 'dotenv'

dotenv.config()

export function buildStreamId(env = process.env) {
    if (env.STREAMR_STREAM_ID) {
        return env.STREAMR_STREAM_ID
    }

    if (env.STREAMR_ETH_ACCOUNT && env.STREAM_ID) {
        return `${env.STREAMR_ETH_ACCOUNT}/${env.STREAM_ID}`
    }

    throw new Error('Missing stream identifier: set STREAMR_STREAM_ID or both STREAMR_ETH_ACCOUNT and STREAM_ID')
}

export function loadBaseConfig(env = process.env) {
    const privateKey = env.STREAMR_PRIVATE_KEY
    if (!privateKey) {
        throw new Error('STREAMR_PRIVATE_KEY is required')
    }

    const streamId = buildStreamId(env)
    const logLevel = env.LOG_LEVEL ?? 'info'

    return {
        privateKey,
        streamId,
        logLevel,
    }
}
