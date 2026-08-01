import { expect, test } from '@playwright/test'
import { App } from './app'

test.describe('crops and people', () => {
  let app: App

  test.beforeEach(async ({ page }) => {
    app = new App(page)
    await app.open()
  })

  test('creates a crop and opens it', async () => {
    await expect(app.page.getByText('No crops yet')).toBeVisible()
    await app.createCrop('Cotton', 'Kharif 2026')
    // Creating drops you inside the new crop.
    await expect(app.page.getByText('Kharif 2026')).toBeVisible()

    await app.page.goto('./')
    await expect(app.cropRows).toHaveCount(1)
    await expect(app.cropRows.first()).toContainText('Cotton')
    await app.openCrop('Cotton')
  })

  test('keeps several crops apart', async () => {
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.createCrop('Soybean', 'Kharif 2026')
    await app.page.goto('./')
    await expect(app.cropRows).toHaveCount(2)


    await app.openCrop('Cotton')
    await app.addPeople('Bhojraj')
    await app.addExpense({ amount: '1000', notes: 'cotton seed' })

    await app.openCrop('Soybean')
    await app.addPeople('Bhojraj')
    await app.goToTab('Expenses')
    // An expense belongs to one crop; the other crop must not see it.
    await expect(app.expenseRows).toHaveCount(0)
    await app.doesNotShow('cotton seed')
  })

  test('archives a crop and restores it', async () => {
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.openCrop('Cotton')
    await app.page.getByRole('button', { name: 'Archive' }).click()

    await app.page.getByRole('link', { name: /All crops/ }).click()
    await expect(app.page.getByText('Harvested & archived')).toBeVisible()

    // Restoring happens from inside the crop, where Archive becomes Restore.
    await app.openCrop('Cotton')
    await app.page.getByRole('button', { name: 'Restore' }).click()
    // Wait for the app's own confirmation that the flag flipped — reloading
    // first can re-read storage before the write has landed.
    await expect(app.page.getByRole('button', { name: 'Archive' })).toBeVisible()
    await app.page.goto('./')
    await expect(app.page.getByText('Harvested & archived')).toBeHidden()
    await expect(app.cropRows).toHaveCount(1)
  })

  test('deletes a crop with everything on it', async () => {
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.openCrop('Cotton')
    await app.addPeople('Bhojraj')
    await app.addExpense({ amount: '1000' })

    await app.page.getByRole('button', { name: 'Delete' }).first().click()
    await app.dialog.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(app.page.getByText('No crops yet')).toBeVisible()
  })

  test('renames a person and shows the new name on the expense', async () => {
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.openCrop('Cotton')
    await app.addPeople('Bhojrj')
    await app.addExpense({ amount: '1000', notes: 'seed' })

    await app.goToTab('People')
    await app.page.getByRole('button', { name: /Rename/ }).first().click()
    await app.dialog.getByLabel('Name', { exact: true }).fill('Bhojraj')
    await app.dialog.getByRole('button', { name: 'Save', exact: true }).click()

    await app.goToTab('Expenses')
    await expect(app.expenseRow('seed')).toContainText('Bhojraj paid')
  })

  test('refuses a second person with the same name', async () => {
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.openCrop('Cotton')
    await app.addPeople('Bhojraj')

    await app.page.getByLabel('Add someone').fill('Bhojraj')
    await app.page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(app.page.getByText(/already on this crop/)).toBeVisible()
  })

  test('sends you to add people before an expense can exist', async () => {
    await app.createCrop('Cotton', 'Kharif 2026')
    await app.goToTab('Expenses')
    await expect(app.page.getByText('Add people first')).toBeVisible()
  })
})
