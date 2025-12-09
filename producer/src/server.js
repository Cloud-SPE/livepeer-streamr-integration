import { WebSocketServer } from 'ws'

function ensurePublishable(streamrClient) {
    if (!streamrClient || typeof streamrClient.publish !== 'function') {
        throw new Error('streamrClient with a publish function is required')
    }
}

export async function handleIncomingPayload({
    raw,
    streamrClient,
    streamId,
    logger,
    socket,
    connectionId,
    remoteAddress,
}) {
    let payload

    try {
        payload = JSON.parse(raw)
    } catch (error) {
        logger.warn(
            { connectionId, remoteAddress, raw },
            'Failed to parse incoming payload as JSON',
        )
        socket.send(JSON.stringify({ status: 'error', error: 'Invalid JSON payload' }))
        return { status: 'error', reason: 'invalid-json' }
    }

    logger.debug({ connectionId, remoteAddress, payload }, 'Publishing payload to Streamr')

    try {
        await streamrClient.publish(streamId, payload)
        logger.info(
            { connectionId, remoteAddress },
            'Payload published to Streamr successfully',
        )
        console.log(
            JSON.stringify(payload, null, 2)
        )
        socket.send(JSON.stringify({ status: 'ok' }))
        return { status: 'ok' }
    } catch (error) {
        logger.error(
            { connectionId, remoteAddress, err: error },
            'Failed to publish payload to Streamr',
        )
        socket.send(
            JSON.stringify({
                status: 'error',
                error: 'Failed to publish message to Streamr',
            }),
        )
        return { status: 'error', reason: 'publish-failed', error }
    }
}

export async function startWebSocketStreamServer({ streamrClient, streamId, logger, port }) {
    ensurePublishable(streamrClient)

    if (!streamId) {
        throw new Error('streamId is required')
    }

    if (typeof port !== 'number') {
        throw new Error('port is required')
    }

    const wss = new WebSocketServer({ port })

    let connectionCounter = 0

    const started = new Promise((resolve, reject) => {
        const onListening = () => {
            wss.removeListener('error', onError)
            const address = wss.address()
            logger.info(
                { port: address?.port ?? port, streamId },
                'WebSocket server is listening for incoming data',
            )
            resolve()
        }

        const onError = (error) => {
            logger.error({ err: error }, 'WebSocket server failed to start')
            reject(error)
        }

        wss.once('listening', onListening)
        wss.once('error', onError)
    })

    wss.on('connection', (socket, request) => {
        const connectionId = ++connectionCounter
        const remoteAddress = request.socket.remoteAddress

        logger.info({ connectionId, remoteAddress }, 'WebSocket producer connected')

        socket.on('message', (data) => {
            const raw = data.toString()

            void handleIncomingPayload({
                raw,
                streamrClient,
                streamId,
                logger,
                socket,
                connectionId,
                remoteAddress,
            })
        })

        socket.on('close', (code, reason) => {
            logger.info(
                {
                    connectionId,
                    remoteAddress,
                    code,
                    reason: reason instanceof Buffer ? reason.toString() : reason,
                },
                'WebSocket producer disconnected',
            )
        })

        socket.on('error', (error) => {
            logger.warn({ connectionId, remoteAddress, err: error }, 'WebSocket producer error')
        })
    })

    wss.on('error', (error) => {
        logger.error({ err: error }, 'WebSocket server error')
    })

    await started

    const stop = () =>
        new Promise((resolve, reject) => {
            wss.close((error) => {
                if (error) {
                    logger.error({ err: error }, 'Error while closing WebSocket server')
                    reject(error)
                    return
                }

                logger.info('WebSocket server stopped')
                resolve()
            })
        })

    return {
        server: wss,
        stop,
    }
}
