import { expect, test } from '@playwright/test'
import { App } from './app'

test.describe('expenses', () => {
  let app: App

  test.beforeEach(async ({ page }) => {
    app = new App(page)
    await app.open()
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.openCrop('Cotton')
    await app.addPeople('Bhojraj', 'Ganesh')
  })

  test('keeps every expense added in one sitting', async () => {
    // The regression that lost real data: the form reused one id for the
    // whole visit, so each save overwrote the one before it. Adding without
    // navigating away in between is the case that broke.
    await app.addExpense({ amount: '1000', notes: 'first' })
    await app.addExpense({ amount: '2000', notes: 'second' })
    await app.addExpense({ amount: '3000', notes: 'third' })

    await expect(app.expenseRows).toHaveCount(3)
    await app.shows('₹6,000')
  })

  test('survives a reload with the same rows and order', async ({ page }) => {
    await app.addExpense({ amount: '1000', notes: 'june', date: '2026-06-01' })
    await app.addExpense({ amount: '2000', notes: 'august', date: '2026-08-01' })
    await app.addExpense({ amount: '3000', notes: 'july', date: '2026-07-01' })

    const before = await app.expenseRows.allInnerTexts()
    await page.reload()
    await expect(app.expenseRows).toHaveCount(3)
    // Saves update the list in memory rather than re-reading it, so the
    // in-memory order has to match what a fresh read produces.
    expect(await app.expenseRows.allInnerTexts()).toEqual(before)
  })

  test('edits an expense without duplicating it', async () => {
    await app.addExpense({ amount: '1000', notes: 'seed' })
    await app.expenseRow('seed').getByText('Edit', { exact: true }).click()
    await app.dialog.getByLabel('Amount', { exact: true }).fill('1500')
    await app.dialog.getByRole('button', { name: 'Save changes' }).click()

    await expect(app.expenseRows).toHaveCount(1)
    await app.shows('₹1,500')
  })

  test('deletes an expense and drops it from the total', async () => {
    await app.addExpense({ amount: '1000', notes: 'keep' })
    await app.addExpense({ amount: '2000', notes: 'remove' })

    await app.expenseRow('remove').getByText('Delete', { exact: true }).click()
    await app.dialog.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(app.expenseRows).toHaveCount(1)
    await app.shows('₹1,000')
  })

  test('records a payment against a credit expense from the expenses list', async () => {
    // The button used to exist only on the Summary tab, which is not where
    // anyone looks after spotting an unpaid bill in the list they are reading.
    await app.addExpense({
      amount: '4200',
      notes: 'fertiliser',
      pay: { mode: 'credit' },
      owedTo: 'Sharma Krishi Kendra',
    })

    const row = app.expenseRow('fertiliser')
    await expect(row).toContainText('₹4,200 pending')

    await row.getByRole('button', { name: 'Record payment' }).click()
    await app.dialog.getByRole('button', { name: 'Bhojraj', exact: true }).click()
    await app.dialog.getByRole('button', { name: 'Record payment' }).click()

    await expect(app.expenseRow('fertiliser')).not.toContainText('pending')
    await expect(app.expenseRow('fertiliser')).toContainText('Bhojraj paid')
  })

  test('tracks a part payment and clears the rest later', async () => {
    await app.addExpense({
      amount: '4200',
      notes: 'labour',
      pay: { mode: 'part', paid: '1000' },
      paidBy: 'Bhojraj',
    })
    await expect(app.expenseRow('labour')).toContainText('₹3,200 pending')

    await app.expenseRow('labour').getByRole('button', { name: 'Record payment' }).click()
    await app.dialog.getByRole('button', { name: 'Ganesh', exact: true }).click()
    await app.dialog.getByRole('button', { name: 'Record payment' }).click()

    await expect(app.expenseRow('labour')).not.toContainText('pending')
  })

  test('takes two payers for one bill and settles the difference', async () => {
    await app.addExpense({
      amount: '8000',
      notes: 'seed',
      payers: { Bhojraj: '5000', Ganesh: '3000' },
    })

    await expect(app.expenseRow('seed')).toContainText('Bhojraj, Ganesh paid')

    await app.goToTab('Summary')
    await expect(app.transferRows).toHaveCount(1)
    await expect(app.transferRows.first()).toContainText('Ganesh pays Bhojraj')
    await expect(app.transferRows.first()).toContainText('₹1,000')
  })

  test('refuses a payer split that does not add up', async () => {
    await app.goToTab('Expenses')
    await app.page.getByRole('button', { name: /^\+ Add$|Add the first expense/ }).first().click()
    const form = app.dialog
    await form.getByLabel('Amount', { exact: true }).fill('8000')
    await form.getByRole('button', { name: 'Two or more paid' }).click()
    await form.getByLabel('Amount for Bhojraj').fill('5000')
    await form.getByLabel('Amount for Ganesh').fill('4000')
    await form.getByRole('button', { name: 'Add expense' }).click()

    // Still open, with the shortfall named — a payer list that does not sum
    // to what was handed over would quietly distort the settlement.
    await expect(form).toBeVisible()
    await expect(form).toContainText('₹1,000 more than the total')
  })

  test('assigns a whole expense to one person', async () => {
    await app.addExpense({
      amount: '2000',
      notes: 'his seed',
      paidBy: 'Bhojraj',
      owedBy: ['Ganesh'],
    })
    await expect(app.expenseRow('his seed')).toContainText('Ganesh owes it all')

    await app.goToTab('Summary')
    await expect(app.transferRows.first()).toContainText('Ganesh pays Bhojraj')
    await expect(app.transferRows.first()).toContainText('₹2,000')
  })

  test('filters by search and by pending', async () => {
    await app.addExpense({ amount: '1000', notes: 'diesel' })
    await app.addExpense({ amount: '2000', notes: 'wages', pay: { mode: 'credit' } })

    await app.page.getByLabel('Search notes or category').fill('diesel')
    await expect(app.expenseRows).toHaveCount(1)

    await app.page.getByLabel('Search notes or category').fill('')
    await app.page.getByRole('button', { name: /Pending \(1\)/ }).click()
    await expect(app.expenseRows).toHaveCount(1)
    await expect(app.expenseRows.first()).toContainText('wages')
  })
})
