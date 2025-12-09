// consumer/test/streamConsumer.test.js
import { describe, it, expect, vi } from 'vitest'
import { startStreamConsumer } from '../src/streamConsumer.js'

// minimal logger mock, same style as your producer tests
const createMockLogger = () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
})

describe('startStreamConsumer', () => {
    it('subscribes to the stream and writes incoming messages to the event log', async () => {
        const logger = createMockLogger()

        const ensureSchema = vi.fn().mockResolvedValue(undefined)
        const insertEvent = vi.fn().mockResolvedValue(undefined)
        const close = vi.fn().mockResolvedValue(undefined)

        const eventLogRepository = {
            ensureSchema,
            insertEvent,
            close,
        }

        const unsubscribe = vi.fn().mockResolvedValue(undefined)

        const subscribe = vi.fn(async (streamId, handler) => {
            // Save handler so we can simulate an incoming message
            subscribe.handler = handler
            return { streamId, subscriptionId: 'sub-1' }
        })

        const streamrClient = {
            subscribe,
            unsubscribe,
        }

        const streamId = 'tester/stream'

        const { stop, subscription } = await startStreamConsumer({
            streamrClient,
            streamId,
            logger,
            eventLogRepository,
        })

        // ensureSchema should be called once at startup
        expect(ensureSchema).toHaveBeenCalledTimes(1)

        // subscribe should be called with the streamId and a handler function
        expect(subscribe).toHaveBeenCalledTimes(1)
        expect(subscribe).toHaveBeenCalledWith(streamId, expect.any(Function))

        // Simulate an incoming message from Streamr
        const content = { hello: 'world' }
        const metadata = {
            messageId: {
                timestamp: 1710000000000,
                streamPartition: 0,
                sequenceNumber: 42,
            },
            publisherId: '0x123',
            msgChainId: 'chain-1',
        }

        // call the captured handler: second arg of the first subscribe call
        const handler = subscribe.mock.calls[0][1]
        await handler(content, metadata)

        expect(insertEvent).toHaveBeenCalledTimes(1)
        expect(insertEvent).toHaveBeenCalledWith({
            streamId,
            msgTimestamp: metadata.messageId.timestamp,
            streamPartition: metadata.messageId.streamPartition,
            sequenceNumber: metadata.messageId.sequenceNumber,
            publisherId: metadata.publisherId,
            msgChainId: metadata.msgChainId,
            payload: content,
        })

        // Now test stop() behavior
        await stop()

        expect(unsubscribe).toHaveBeenCalledTimes(1)
        expect(unsubscribe).toHaveBeenCalledWith(subscription)
        expect(close).toHaveBeenCalledTimes(1)
    })

    it('throws if streamrClient is missing', async () => {
        const logger = createMockLogger()
        const eventLogRepository = {
            ensureSchema: vi.fn(),
            insertEvent: vi.fn(),
        }

        await expect(
            startStreamConsumer({
                // streamrClient: undefined,
                streamId: 'tester/stream',
                logger,
                eventLogRepository,
            }),
        ).rejects.toThrow('streamrClient is required')
    })

    it('throws if streamId is missing', async () => {
        const logger = createMockLogger()
        const eventLogRepository = {
            ensureSchema: vi.fn(),
            insertEvent: vi.fn(),
        }

        const streamrClient = {
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
        }

        await expect(
            startStreamConsumer({
                streamrClient,
                // streamId: undefined,
                logger,
                eventLogRepository,
            }),
        ).rejects.toThrow('streamId is required')
    })
})
