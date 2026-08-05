import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { App } from './app'

test.describe('exports, backup and language', () => {
  let app: App

  test.beforeEach(async ({ page }) => {
    app = new App(page)
    await app.open()
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.openCrop('Cotton')
    await app.addPeople('Bhojraj', 'Ganesh')
    await app.addExpense({ amount: '8000', notes: 'seed', paidBy: 'Bhojraj' })
  })

  test('keeps the export buttons reachable without scrolling', async ({ page }) => {
    // They used to be the last thing on the page, under every other section,
    // so a season's worth of entries meant scrolling past the lot to print a
    // sheet. Asserted on a deliberately busy crop, since that is the case
    // that made it a problem.
    await app.addExpense({ amount: '7320', pay: { mode: 'credit' }, owedTo: 'Sharma Krishi Kendra' })
    await app.addExpense({ amount: '4200', pay: { mode: 'credit' }, owedTo: 'Patil Tractors' })
    await app.addExpense({ amount: '3000', paidBy: 'Ganesh' })
    await app.addSale({ quantity: '18', rate: '2200', receivedBy: 'Ganesh' })
    await app.goToTab('Summary')

    await expect(
      page.getByRole('button', { name: 'Print / Save as PDF' })
    ).toBeInViewport()
    await expect(
      page.getByRole('button', { name: 'Download spreadsheet' })
    ).toBeInViewport()
  })

  test('downloads a spreadsheet of the season', async ({ page }) => {
    await app.goToTab('Summary')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download spreadsheet' }).click(),
    ])

    const csv = readFileSync(await download.path(), 'utf8')
    // The byte-order mark, without which Excel mangles Marathi names.
    expect(csv.startsWith('﻿')).toBe(true)
    // A bare decimal a spreadsheet can add up, not ₹8,000.
    expect(csv).toContain('8000.00')
    expect(csv).toContain('Who owes whom')
    expect(csv).toContain('Ganesh,Bhojraj,4000.00')
  })

  test('backs the ledger up and restores it after a wipe', async ({ page }) => {
    await page.goto('./settings')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download backup' }).click(),
    ])
    const file = await download.path()

    // Lose everything, the way clearing site data would.
    await page.evaluate(async () => {
      for (const db of await indexedDB.databases()) {
        if (db.name) indexedDB.deleteDatabase(db.name)
      }
    })
    await page.goto('./')
    await expect(page.getByText('No crops yet')).toBeVisible()

    await page.goto('./settings')
    await page.getByRole('button', { name: 'Choose backup file' }).click()
    await page.locator('input[type=file]').setInputFiles(file)
    await expect(page.getByText(/Restored/)).toBeVisible()

    await page.goto('./')
    await expect(app.cropRows).toHaveCount(1)
    await app.openCrop('Cotton')
    await expect(app.expenseRow('seed')).toContainText('₹8,000')
  })

  test('switches to Marathi and back', async ({ page }) => {
    await page.goto('./settings')
    await page.getByText('मराठी', { exact: true }).click()
    await expect(page.getByText('बॅकअप व पुनर्संचयन')).toBeVisible()

    await page.goto('./')
    // The crop list, in Marathi, still showing the same crop.
    await expect(page.getByText('सुरू असलेली पिके')).toBeVisible()
    await expect(app.cropRows.first()).toContainText('Cotton')

    await page.goto('./settings')
    await page.getByText('English', { exact: true }).click()
    await expect(page.getByText('Backup & restore')).toBeVisible()
  })

  test('remembers the language across a reload', async ({ page }) => {
    await page.goto('./settings')
    await page.getByText('मराठी', { exact: true }).click()
    await page.reload()
    await expect(page.getByText('बॅकअप व पुनर्संचयन')).toBeVisible()
  })

  test('reports the build version', async ({ page }) => {
    await page.goto('./settings')
    // The stamp that tells a stale cached app from a current one.
    await expect(page.getByText('Version', { exact: true })).toBeVisible()
    await expect(page.getByText(/^v\d+\.\d+\.\d+/)).toBeVisible()
  })
})

test.describe('offline', () => {
  test('says an entry is saved here and will sync, without a signal', async ({
    page,
    context,
  }) => {
    // Without an account there is no server to sync to, so the app must not
    // promise one. This build has no Firebase configured, which is exactly
    // that case: entering an expense offline still works and says nothing
    // about syncing.
    const app = new App(page)
    await app.open()
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.openCrop('Cotton')
    await app.addPeople('Bhojraj')

    await context.setOffline(true)
    await app.addExpense({ amount: '1500', notes: 'diesel' })

    await expect(app.expenseRow('diesel')).toContainText('₹1,500')
    await app.doesNotShow('will go to your account')

    await context.setOffline(false)
    await page.reload()
    await expect(app.expenseRow('diesel')).toContainText('₹1,500')
  })
})
