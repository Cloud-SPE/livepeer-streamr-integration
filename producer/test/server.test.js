import { describe, expect, it, vi } from 'vitest'
import { handleIncomingPayload } from '../src/server.js'

const createMockLogger = () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
})

const createMockSocket = () => {
    const messages = []
    return {
        messages,
        send: vi.fn((payload) => {
            messages.push(payload)
        }),
    }
}

const baseContext = {
    streamId: 'tester/stream',
    connectionId: 1,
    remoteAddress: '127.0.0.1',
}

describe('handleIncomingPayload', () => {
    it('publishes valid JSON payloads to Streamr and acknowledges the sender', async () => {
        const publish = vi.fn().mockResolvedValue(undefined)
        const logger = createMockLogger()
        const socket = createMockSocket()

        const result = await handleIncomingPayload({
            raw: JSON.stringify({ hello: 'world' }),
            streamrClient: { publish },
            logger,
            socket,
            ...baseContext,
        })

        expect(result).toEqual({ status: 'ok' })
        expect(publish).toHaveBeenCalledTimes(1)
        expect(publish).toHaveBeenCalledWith('tester/stream', { hello: 'world' })
        expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ status: 'ok' }))
    })

    it('responds with an error when payload is not valid JSON', async () => {
        const publish = vi.fn().mockResolvedValue(undefined)
        const logger = createMockLogger()
        const socket = createMockSocket()

        const result = await handleIncomingPayload({
            raw: 'not-json',
            streamrClient: { publish },
            logger,
            socket,
            ...baseContext,
        })

        expect(result.status).toBe('error')
        expect(result.reason).toBe('invalid-json')
        expect(publish).not.toHaveBeenCalled()
        expect(socket.send).toHaveBeenCalledWith(
            JSON.stringify({ status: 'error', error: 'Invalid JSON payload' }),
        )
    })

    it('logs and responds with an error when publishing fails', async () => {
        const publishError = new Error('boom')
        const publish = vi.fn().mockRejectedValue(publishError)
        const logger = createMockLogger()
        const socket = createMockSocket()

        const result = await handleIncomingPayload({
            raw: JSON.stringify({ hello: 'world' }),
            streamrClient: { publish },
            logger,
            socket,
            ...baseContext,
        })

        expect(result.status).toBe('error')
        expect(result.reason).toBe('publish-failed')
        expect(result.error).toBe(publishError)
        expect(logger.error).toHaveBeenCalledWith(
            { connectionId: 1, remoteAddress: '127.0.0.1', err: publishError },
            'Failed to publish payload to Streamr',
        )
        expect(socket.send).toHaveBeenCalledWith(
            JSON.stringify({
                status: 'error',
                error: 'Failed to publish message to Streamr',
            }),
        )
    })
})
