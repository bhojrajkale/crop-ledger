import { afterAll, describe, expect, it } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { disableNetwork, type Firestore } from 'firebase/firestore'
import { cloudRepository } from './cloudRepository'
import type { Expense } from '../domain/types'

/**
 * Does a write resolve when the device cannot reach the server?
 *
 * The store awaits every write before it updates the screen, which was right
 * when the only backing store was on the device. If Firestore's write promise
 * waits for a server acknowledgement, that same pattern means a tap in a
 * field with no signal updates nothing at all.
 */
const env = await initializeTestEnvironment({
  projectId: 'demo-crop-ledger',
  firestore: { host: '127.0.0.1', port: 8080 },
})

afterAll(async () => {
  await env.cleanup()
})

const expense: Expense = {
  id: 'e1',
  cropId: 'c1',
  amount: 420000,
  category: 'fertilizer',
  date: '2026-07-31',
  notes: '',
  payments: [{ id: 'p1', memberId: 'm1', amount: 420000, paidAt: '2026-07-31' }],
  owedBy: ['m1', 'm2'],
  createdAt: '2026-07-31T00:00:00.000Z',
}

/** Resolves to 'hung' if the work has not finished within the grace period. */
const within = (work: Promise<unknown>, ms = 3000) =>
  Promise.race([
    work.then(() => 'resolved').catch(() => 'rejected'),
    new Promise((resolve) => setTimeout(() => resolve('hung'), ms)),
  ])

describe('with no connection', () => {
  it('resolves a write rather than hanging on a server acknowledgement', async () => {
    const db = env
      .authenticatedContext('owner-1')
      .firestore() as unknown as Firestore
    const repo = cloudRepository('owner-1', { firestore: db })

    await disableNetwork(db)

    expect(await within(repo.saveExpense(expense))).toBe('resolved')
  }, 10_000)

  it('reads back what was just written, so the screen can update', async () => {
    // The write only counts if the re-read that follows it sees the change —
    // that pair is what every mutation in the store is built from.
    const db = env
      .authenticatedContext('owner-2')
      .firestore() as unknown as Firestore
    const repo = cloudRepository('owner-2', { firestore: db })

    await disableNetwork(db)
    await repo.saveExpense(expense)

    expect(await within(repo.listExpenses('c1'))).toBe('resolved')
    const rows = await repo.listExpenses('c1')
    expect(rows.map((e) => e.id)).toEqual(['e1'])
  }, 15_000)
})
