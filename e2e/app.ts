import { expect, type Locator, type Page } from '@playwright/test'

/**
 * The app, driven the way a person drives it.
 *
 * Specs speak in these terms rather than in selectors, so a layout change
 * breaks one method here instead of thirty assertions. Tests run in English —
 * the default is Marathi, and one spec covers the switch itself — because a
 * failure message naming a button you can read is worth more than testing the
 * catalogue twice.
 */
export class App {
  constructor(readonly page: Page) {}

  /** A clean device: no crops, no expenses, English. */
  async open() {
    await this.page.goto('./')
    await this.page.evaluate(async () => {
      // Wipe IndexedDB so each test starts from nothing. Without this the
      // suite passes in isolation and fails in a run.
      for (const db of await indexedDB.databases()) {
        if (db.name) indexedDB.deleteDatabase(db.name)
      }
      localStorage.clear()
    })
    await this.page.goto('./settings')
    await this.page.getByText('English', { exact: true }).click()
    await this.page.goto('./')
    await expect(this.page.getByText('Crop Ledger')).toBeVisible()
  }

  // --- crops ---------------------------------------------------------------

  get cropRows() {
    return this.page.getByTestId('crop-row')
  }

  async createCrop(name: string, season?: string) {
    // Always start from the crop list: the button lives only there, and
    // creating a crop leaves you inside it.
    await this.page.goto('./')
    await this.page
      .getByRole('button', { name: /New crop|Add your first crop/ })
      .first()
      .click()
    const form = this.dialog
    await form.getByLabel('Crop', { exact: true }).fill(name)
    if (season) await form.getByLabel('Season').fill(season)
    await form.getByRole('button', { name: 'Create crop' }).click()
    // The app drops you into the new crop's People tab.
    await this.page.waitForURL(/\/members$/)
  }

  /**
   * Opens a crop from the list, whatever screen you were on.
   *
   * Deliberately unconditional. An earlier version tried to skip the
   * navigation when it thought you were already inside the right crop, and
   * got it wrong mid-transition — leaving the test tapping tabs that were not
   * on screen. Going through the list every time costs a page load and buys
   * certainty.
   */
  async openCrop(name: string) {
    await this.page.goto('./')
    const row = this.cropRows.filter({ hasText: name })
    await expect(row).toHaveCount(1)
    await row.first().click()
    await this.page.waitForURL(/\/crop\//)
    await expect(this.tab('Expenses')).toBeVisible()
  }

  // --- navigation ----------------------------------------------------------

  tab(name: 'Expenses' | 'People' | 'Harvest' | 'Summary') {
    return this.page.getByRole('link', { name, exact: true })
  }

  async goToTab(name: 'Expenses' | 'People' | 'Harvest' | 'Summary') {
    await this.tab(name).click()
    // Wait for the route, not just the click: reading the page straight after
    // clicking returns the tab you were on, and the assertion then describes
    // the wrong screen.
    // The People tab lives at /members, so the label is not the path.
    const path = { Expenses: 'expenses', People: 'members', Harvest: 'harvest', Summary: 'summary' }[name]
    await this.page.waitForURL(new RegExp(`/${path}$`))
  }

  get dialog() {
    return this.page.locator('[role=dialog]')
  }

  // --- people --------------------------------------------------------------

  async addPeople(...names: string[]) {
    await this.goToTab('People')
    for (const name of names) {
      await this.page.getByLabel('Add someone').fill(name)
      await this.page.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(this.page.getByText(name, { exact: true })).toBeVisible()
    }
  }

  // --- expenses ------------------------------------------------------------

  get expenseRows() {
    return this.page.getByTestId('expense-row')
  }

  expenseRow(text: string) {
    return this.expenseRows.filter({ hasText: text }).first()
  }

  /**
   * Adds an expense. Everything but the amount is optional, so a spec only
   * states the part it is actually about.
   */
  async addExpense(options: {
    amount: string
    notes?: string
    date?: string
    /** Omit for "paid in full" by the first person. */
    pay?: { mode: 'credit' } | { mode: 'part'; paid: string } | { mode: 'full' }
    paidBy?: string
    /** Amount per payer; switches the form to several payers. */
    payers?: Record<string, string>
    owedBy?: string[]
    owedTo?: string
  }) {
    await this.goToTab('Expenses')
    await this.page
      .getByRole('button', { name: /^\+ Add$|Add the first expense/ })
      .first()
      .click()
    const form = this.dialog
    await form.getByLabel('Amount', { exact: true }).fill(options.amount)

    const mode = options.pay?.mode ?? 'full'
    if (mode === 'credit') await form.getByText('On credit', { exact: true }).click()
    if (options.pay?.mode === 'part') {
      await form.getByText('Partly paid', { exact: true }).click()
      await form.getByLabel('Paid so far').fill(options.pay.paid)
    }

    if (options.payers) {
      await form.getByRole('button', { name: 'Two or more paid' }).click()
      for (const [name, amount] of Object.entries(options.payers)) {
        await form.getByLabel(`Amount for ${name}`).fill(amount)
      }
    } else if (options.paidBy && mode !== 'credit') {
      await form.getByRole('button', { name: options.paidBy, exact: true }).first().click()
    }

    if (options.owedBy) {
      await form.getByRole('button', { name: 'Clear' }).click()
      for (const name of options.owedBy) {
        await form.getByRole('button', { name, exact: true }).last().click()
      }
    }
    if (options.owedTo) await form.getByLabel('Owed to').fill(options.owedTo)
    if (options.date) await form.locator('input[type=date]').fill(options.date)
    if (options.notes) await form.getByLabel('Notes').fill(options.notes)

    await form.getByRole('button', { name: 'Add expense' }).click()
    await expect(form).toBeHidden()
  }

  // --- harvest -------------------------------------------------------------

  async addSale(options: {
    quantity: string
    rate: string
    receivedBy: string
    buyer?: string
  }) {
    await this.goToTab('Harvest')
    await this.page
      .getByRole('button', { name: /^\+ Add$|Record the first sale/ })
      .first()
      .click()
    const form = this.dialog
    await form.getByLabel('Quantity').fill(options.quantity)
    await form.getByLabel(/^Rate per/).fill(options.rate)
    await form.getByRole('button', { name: options.receivedBy, exact: true }).click()
    if (options.buyer) await form.getByLabel('Buyer').fill(options.buyer)
    await form.getByRole('button', { name: 'Record a sale' }).click()
    await expect(form).toBeHidden()
  }

  // --- summary -------------------------------------------------------------

  get transferRows() {
    return this.page.getByTestId('transfer-row')
  }

  personRow(name: string) {
    return this.page.getByTestId('person-row').filter({ hasText: name }).first()
  }

  /**
   * Asserts a figure appears somewhere on the page.
   *
   * An auto-retrying assertion rather than a snapshot of innerText: reading
   * the text once, straight after a navigation, captures the screen you were
   * leaving and then describes the wrong thing in the failure message.
   */
  async shows(...texts: string[]) {
    for (const text of texts) {
      await expect(this.page.locator('body')).toContainText(text)
    }
  }

  async doesNotShow(text: string) {
    await expect(this.page.locator('body')).not.toContainText(text)
  }

  /** The whole page as text. Only for reading, never for asserting. */
  async text(): Promise<string> {
    return this.page.locator('body').innerText()
  }
}

/** Fails the test if the row does not carry the expected amount. */
export async function expectAmount(row: Locator, amount: string) {
  await expect(row).toContainText(amount)
}
