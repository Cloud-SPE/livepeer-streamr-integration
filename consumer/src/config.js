import { loadBaseConfig } from '@livepeer-streamr/shared'

export function loadConfig(env = process.env) {
    const base = loadBaseConfig(env)

    const databaseUrl = env.DATABASE_URL
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required')
    }

    return {
        ...base,
        databaseUrl,
    }
}
