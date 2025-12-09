// consumer/test/eventLogRepository.test.js
import { describe, it, expect, vi } from 'vitest'
import { createEventLogRepository } from '../src/eventLogRepository.js'

const createMockLogger = () => ({
    info: vi.fn(),
    error: vi.fn(),
})

describe('createEventLogRepository', () => {
    it('creates schema and inserts events correctly', async () => {
        const logger = createMockLogger()

        // Mock Pool
        const mockQuery = vi.fn().mockResolvedValue(undefined)
        const mockEnd = vi.fn().mockResolvedValue(undefined)

        const pool = {
            query: mockQuery,
            end: mockEnd,
        }

        const repo = createEventLogRepository(pool, logger)

        //
        // 1. ensureSchema()
        //
        await repo.ensureSchema()

        // It should run 2 queries (CREATE TABLE + CREATE INDEX)
        expect(mockQuery).toHaveBeenCalledTimes(2)

        // Validate SQL keywords lightly (not entire string match),
        // ensures refactoring doesn’t break intent
        const schemaSQL = mockQuery.mock.calls[0][0]
        expect(schemaSQL).toContain('CREATE TABLE IF NOT EXISTS stream_event_log')

        const indexSQL = mockQuery.mock.calls[1][0]
        expect(indexSQL).toContain('CREATE INDEX IF NOT EXISTS')

        //
        // 2. insertEvent()
        //
        const mockEvent = {
            streamId: 'tester/stream',
            msgTimestamp: 1710000000000,
            streamPartition: 0,
            sequenceNumber: 42,
            publisherId: '0x123',
            msgChainId: 'chain-1',
            payload: { hello: 'world' },
        }

        await repo.insertEvent(mockEvent)

        // Now query should have been called 3 times total
        expect(mockQuery).toHaveBeenCalledTimes(3)

        const insertCall = mockQuery.mock.calls[2]
        const insertSQL = insertCall[0]
        const insertParams = insertCall[1]

        // SQL should contain INSERT INTO target table
        expect(insertSQL).toContain('INSERT INTO stream_event_log')

        // Params must match the event in correct order
        expect(insertParams).toEqual([
            mockEvent.streamId,
            new Date(mockEvent.msgTimestamp), // converted inside repo
            mockEvent.streamPartition,
            mockEvent.sequenceNumber,
            mockEvent.publisherId,
            mockEvent.msgChainId,
            mockEvent.payload,
        ])

        //
        // 3. close()
        //
        await repo.close()
        expect(mockEnd).toHaveBeenCalledTimes(1)
    })
})
