import { expect, test } from '@playwright/test'
import { App } from './app'

test.describe('settlement and harvest', () => {
  let app: App

  test.beforeEach(async ({ page }) => {
    app = new App(page)
    await app.open()
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.openCrop('Cotton')
    await app.addPeople('Bhojraj', 'Ganesh')
  })

  test('settles an evenly split expense paid by one person', async () => {
    await app.addExpense({ amount: '8000', paidBy: 'Bhojraj' })
    await app.goToTab('Summary')

    await expect(app.transferRows).toHaveCount(1)
    await expect(app.transferRows.first()).toContainText('Ganesh pays Bhojraj')
    await expect(app.transferRows.first()).toContainText('₹4,000')
    await expect(app.personRow('Bhojraj')).toContainText('gets ₹4,000')
    await expect(app.personRow('Ganesh')).toContainText('owes ₹4,000')
  })

  test('keeps shop debt out of the settlement between people', async () => {
    // The distinction the whole ledger rests on: money owed to a shop is not
    // money one person owes another, and merging them would tell people to
    // pay each other for money nobody has spent.
    await app.addExpense({
      amount: '4200',
      pay: { mode: 'credit' },
      owedTo: 'Sharma Krishi Kendra',
    })
    await app.goToTab('Summary')

    await app.shows('Still to pay', 'Sharma Krishi Kendra', 'Nothing to settle')
    await expect(app.transferRows).toHaveCount(0)
  })

  test('divides harvest revenue and shows the profit', async () => {
    await app.addExpense({ amount: '11000', paidBy: 'Bhojraj' })
    await app.addExpense({ amount: '7200', paidBy: 'Ganesh' })
    await app.addSale({ quantity: '18', rate: '2200', receivedBy: 'Ganesh' })

    await app.goToTab('Summary')
    await app.shows('₹39,600', '₹21,400') // revenue, then profit
    await expect(app.transferRows.first()).toContainText('Ganesh pays Bhojraj')
    await expect(app.transferRows.first()).toContainText('₹21,700')
  })

  test('explains where a settlement figure came from', async ({ page }) => {
    await app.addExpense({ amount: '11000', paidBy: 'Bhojraj' })
    await app.addExpense({ amount: '7200', paidBy: 'Ganesh' })
    await app.addSale({ quantity: '18', rate: '2200', receivedBy: 'Ganesh' })
    await app.goToTab('Summary')

    await app.personRow('Ganesh').getByRole('button', { name: 'How?' }).click()
    const breakdown = app.dialog
    // The four parts, and the point of the whole thing: most of what he
    // "owes" is the group's sale money he is holding.
    await expect(breakdown).toContainText('Paid for expenses')
    await expect(breakdown).toContainText('₹7,200')
    await expect(breakdown).toContainText('Their share of the harvest')
    await expect(breakdown).toContainText('₹19,800')
    await expect(breakdown).toContainText('Harvest money they collected')
    await expect(breakdown).toContainText('₹39,600')
    await expect(breakdown).toContainText('₹21,700')
    await expect(breakdown).toContainText('holding')
    await page.keyboard.press('Escape')
  })

  test('recalculates when a sale is deleted', async () => {
    await app.addExpense({ amount: '8000', paidBy: 'Bhojraj' })
    await app.addSale({ quantity: '10', rate: '2000', receivedBy: 'Ganesh' })
    await app.goToTab('Harvest')
    await expect(app.page.getByTestId('sale-row')).toHaveCount(1)

    await app.page.getByTestId('sale-row').getByText('Delete', { exact: true }).click()
    await app.dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(app.page.getByTestId('sale-row')).toHaveCount(0)

    await app.goToTab('Summary')
    // Back to the expense-only settlement.
    await expect(app.transferRows.first()).toContainText('₹4,000')
  })

  test('balances stay zero-sum with a custom split', async () => {
    await app.goToTab('Expenses')
    await app.page.getByRole('button', { name: /^\+ Add$|Add the first expense/ }).first().click()
    const form = app.dialog
    await form.getByLabel('Amount', { exact: true }).fill('9000')
    await form.getByRole('button', { name: 'Bhojraj', exact: true }).first().click()
    await form.getByRole('button', { name: 'Custom amounts' }).click()
    await form.getByLabel('Amount for Bhojraj').fill('6000')
    await form.getByLabel('Amount for Ganesh').fill('3000')
    await expect(form).toContainText('Adds up')
    await form.getByRole('button', { name: 'Add expense' }).click()
    await expect(form).toBeHidden()

    await app.goToTab('Summary')
    await expect(app.transferRows.first()).toContainText('₹3,000')
    await expect(app.personRow('Bhojraj')).toContainText('gets ₹3,000')
    await expect(app.personRow('Ganesh')).toContainText('owes ₹3,000')
  })
})
