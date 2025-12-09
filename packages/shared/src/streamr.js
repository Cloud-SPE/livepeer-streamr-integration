// packages/shared/src/streamr.js
import { StreamrClient } from '@streamr/sdk'

export function createStreamrClient(privateKey) {
    if (!privateKey) {
        throw new Error('privateKey is required to create a StreamrClient')
    }

    return new StreamrClient({
        auth: {
            privateKey,
        },
    })
}
