// consumer/src/streamConsumer.js

/**
 * @typedef {Object} StartStreamConsumerOptions
 * @property {import('@streamr/sdk').StreamrClient} streamrClient
 * @property {string} streamId
 * @property {import('pino').Logger} logger
 * @property {{ insertEvent: Function, ensureSchema: Function, close?: Function }} eventLogRepository
 */

/**
 * Start consuming a Streamr stream and writing messages to Postgres.
 *
 * Returns a `stop` function that unsubscribes.
 *
 * @param {StartStreamConsumerOptions} options
 */
export async function startStreamConsumer({
                                              streamrClient,
                                              streamId,
                                              logger,
                                              eventLogRepository,
                                          }) {
    if (!streamrClient) {
        throw new Error('streamrClient is required')
    }
    if (!streamId) {
        throw new Error('streamId is required')
    }

    await eventLogRepository.ensureSchema()

    logger.info({ streamId }, 'Subscribing to Streamr stream')

    // Keep a handle to the subscription so we can cleanly unsubscribe.
    const subscription = await streamrClient.subscribe(streamId, async (content, metadata) => {
        try {
            // `metadata` is MessageMetadata = Omit<Message, 'content'>
            // metadata.messageId is a MessageID with timestamp, sequenceNumber, streamPartition, etc.
            const msgId = metadata?.messageId
            const msgTimestamp = msgId?.timestamp ?? Date.now()
            const streamPartition = msgId?.streamPartition ?? null
            const sequenceNumber = msgId?.sequenceNumber ?? null
            const publisherId = metadata?.publisherId ?? null
            const msgChainId = metadata?.msgChainId ?? null

            await eventLogRepository.insertEvent({
                streamId,
                msgTimestamp,
                streamPartition,
                sequenceNumber,
                publisherId,
                msgChainId,
                payload: content,
            })

            logger.debug(
                {
                    streamId,
                    msgTimestamp,
                    streamPartition,
                    sequenceNumber,
                    publisherId,
                    msgChainId,
                },
                'Persisted Streamr message to event log',
            )
        } catch (err) {
            logger.error({ err }, 'Failed to persist Streamr message to event log')
        }
    })

    const stop = async () => {
        logger.info({ streamId }, 'Stopping Streamr consumer subscription')

        try {
            // You can also pass the subscription object instead of streamId
            await streamrClient.unsubscribe(subscription)
        } catch (err) {
            logger.error({ err }, 'Error while unsubscribing from Streamr stream')
        }

        if (typeof eventLogRepository.close === 'function') {
            try {
                await eventLogRepository.close()
            } catch (err) {
                logger.error({ err }, 'Error while closing event log repository')
            }
        }
    }

    return {
        subscription,
        stop,
    }
}