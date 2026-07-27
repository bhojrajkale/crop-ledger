/**
 * The source catalogue. Every other language is typed against this object, so
 * adding a key here and forgetting to translate it is a build error rather
 * than a stray English word appearing in a Marathi screen.
 *
 * Placeholders are `{name}`. Keys ending `_one` are the singular form and are
 * picked automatically when `count` is 1.
 */
export const en = {
  // Generic actions
  save: 'Save',
  saveChanges: 'Save changes',
  saving: 'Saving…',
  cancel: 'Cancel',
  delete: 'Delete',
  remove: 'Remove',
  edit: 'Edit',
  add: 'Add',
  close: 'Close',
  loading: 'Loading…',
  optional: 'Optional',
  somethingWentWrong: 'Something went wrong.',
  storageFull: 'Could not save. Your browser may be out of storage space.',

  // Crops list
  appTagline: 'Track what each crop costs and who owes whom.',
  growing: 'Growing',
  newCrop: '+ New crop',
  noCropsTitle: 'No crops yet',
  noCropsBody:
    "Start by adding the crop you're growing this season. You can add the people involved and their expenses next.",
  addFirstCrop: 'Add your first crop',
  allArchived: 'Every crop is archived. Restore one below, or add a new crop.',
  archivedSection: 'Harvested & archived',
  archived: 'Archived',
  backupAndRestore: 'Backup & restore',
  allCrops: '← All crops',

  // Crop modal
  editCrop: 'Edit crop',
  cropTitle: 'New crop',
  cropName: 'Crop',
  cropNamePlaceholder: 'Cotton, Soybean, Sugarcane…',
  cropNameMissing: 'Give the crop a name.',
  season: 'Season',
  seasonHint:
    'Lets you grow the same crop again next year without mixing them up.',
  sowingDate: 'Sowing date',
  harvestDate: 'Harvest date',
  endBeforeStart: 'The end date is before the start date.',
  createCrop: 'Create crop',

  // Crop layout
  cropNotFound: 'Crop not found',
  cropNotFoundBody: 'It may have been deleted on this device.',
  backToCrops: 'Back to crops',
  archive: 'Archive',
  restore: 'Restore',
  tabExpenses: 'Expenses',
  tabPeople: 'People',
  tabSummary: 'Summary',
  cropSections: 'Crop sections',
  deleteCropTitle: 'Delete {name}?',
  deleteCropDescription: 'This also deletes every expense recorded against it.',
  deleteCropBody:
    'This cannot be undone, and the data only exists on this device. If you might want it back, export a backup first from Backup & restore.',

  // Members
  addSomeone: 'Add someone',
  name: 'Name',
  duplicateMember: 'Someone with that name is already on this crop.',
  noMembersTitle: 'Nobody added yet',
  noMembersBody:
    "Add everyone involved in this crop. You'll pick who paid and who owes each expense from this list.",
  noExpensesYet: 'No expenses yet',
  onNExpenses: 'On {count}',
  rename: 'Rename',
  renameMember: 'Rename {name}',
  removeMember: 'Remove {name}',
  removeMemberTitle: 'Remove {name}?',
  removeMemberWarning:
    'They appear on {count}. Removing them leaves those expenses in place but drops their share from the settlement, which will change what everyone owes. Consider settling up first.',
  removeMemberSafe: "They aren't on any expenses, so nothing else changes.",

  // Expenses list
  addPeopleFirstTitle: 'Add people first',
  addPeopleFirstBody:
    'An expense needs someone who paid it and someone it belongs to, so start by adding the people involved in this crop.',
  addPeople: 'Add people',
  totalSpent: 'Total spent',
  perHead: '{amount} per head',
  stillToPayShort: '{amount} still to pay',
  addShort: '+ Add',
  noExpensesTitle: 'No expenses yet',
  noExpensesBody:
    "Record what's been spent on this crop — seeds, labour, fuel — and who paid for it.",
  addFirstExpense: 'Add the first expense',
  searchExpenses: 'Search notes or category',
  nothingMatches: 'Nothing matches that.',
  pendingFilter: 'Pending ({count})',
  unpaid: 'Unpaid',
  memberPaid: '{name} paid',
  nPartPayments: '{count} part-payments',
  owesItAll: '{name} owes it all',
  splitNWays: 'split {count} ways',
  splitNWaysCustom: 'split {count} ways (custom)',
  amountPending: '{amount} pending',
  removedMember: 'Removed member',
  viewReceipt: 'Receipt',
  viewNPhotos: '{count} photos',
  deleteExpenseTitle: 'Delete this expense?',
  deleteExpenseBody:
    "{amount} will be removed from this crop's total and the settlement will be recalculated.",

  // Expense form
  addExpense: 'Add expense',
  editExpense: 'Edit expense',
  amount: 'Amount',
  category: 'Category',
  categoryName: 'Category name',
  categoryNamePlaceholder: 'e.g. Crop insurance',
  categoryNameMissing: 'Name the category.',
  amountMissing: 'Enter an amount.',
  paidQuestion: 'Paid?',
  paidInFull: 'Paid in full',
  partlyPaid: 'Partly paid',
  onCredit: 'On credit',
  paidBy: 'Paid by',
  paidByMissing: 'Pick who paid.',
  paidSoFar: 'Paid so far',
  paidSoFarMissing: 'Enter how much has been paid so far.',
  partCoversAll: 'That covers the whole amount — choose “Paid in full” instead.',
  stillOutstanding:
    '{amount} stays outstanding — you can record payments against it later.',
  owedTo: 'Owed to',
  owedToPlaceholder: 'Shop, dealer or contractor (optional)',
  manyPaymentsNote:
    'This expense has several part-payments recorded. Manage them from the Outstanding list on the Summary tab.',
  whoOwes: 'Who owes it',
  everyone: 'Everyone',
  clear: 'Clear',
  whoOwesMissing: 'Pick who this expense is for.',
  paidButOwed: '{payer} paid, but {ower} owes the full amount.',
  split: 'Split',
  equally: 'Equally',
  customAmounts: 'Custom amounts',
  eachAmount: '{amount} each',
  eachAmountRounded:
    '{amount} each (a paisa more for the first few, so it adds up exactly)',
  amountFor: 'Amount for {name}',
  splitOverBy: 'Over by {amount}',
  splitLeftToAssign: '{amount} left to assign',
  splitAddsUp: 'Adds up ✓',
  splitOverError: 'The split is over by {amount}.',
  splitShortError: '{amount} is still unassigned.',
  date: 'Date',
  notes: 'Notes',
  notesPlaceholder: 'Optional — bill number, shop, anything worth remembering',

  // Harvest
  tabHarvest: 'Harvest',
  noSalesTitle: 'Nothing sold yet',
  noSalesBody:
    'When the crop is sold, record what went out and what it fetched. The money is then split equally between everyone on the crop.',
  addFirstSale: 'Record the first sale',
  addSale: 'Record a sale',
  editSale: 'Edit sale',
  deleteSaleTitle: 'Delete this sale?',
  deleteSaleBody:
    '{amount} will be removed from this crop\u2019s revenue and the settlement will be recalculated.',
  quantity: 'Quantity',
  quantityMissing: 'Enter how much was sold.',
  unit: 'Unit',
  unitQuintal: 'Quintal',
  unitKg: 'Kg',
  unitTonne: 'Tonne',
  unitBag: 'Bag',
  ratePerUnit: 'Rate per {unit}',
  rateMissing: 'Enter the rate.',
  saleTotal: 'Total',
  receivedBy: 'Money received by',
  receivedByMissing: 'Pick who received the money.',
  buyer: 'Buyer',
  buyerPlaceholder: 'Trader or market (optional)',
  totalRevenue: 'Revenue',
  revenuePerHead: '{amount} each',
  soldQuantity: '{amount} {unit} at {rate} average',
  netProfit: 'Profit',
  netLoss: 'Loss',
  netExplainer: 'Revenue {revenue} minus expenses {expenses}.',
  holdingAmount: 'holding {amount}',
  revenueNotSettled:
    'Nobody has recorded a sale yet, so there is no revenue to divide.',

  // Receipts
  receipts: 'Receipts',
  takePhoto: '📷 Take photo',
  choosePhoto: '🖼️ Choose photo',
  adding: 'Adding…',
  photosHint: 'Photos are shrunk before saving and stay on this device.',
  photosStored:
    '{photos} · {size} after shrinking. Stored on this device only.',
  photos: '{count} photos',
  photos_one: '{count} photo',
  notImages: '{count} file(s) were not images',
  couldNotRead: '{count} could not be read',
  viewReceiptLabel: 'View receipt',
  removeReceipt: 'Remove receipt',
  closeReceipt: 'Close receipt',
  receiptOf: '{current} of {total}',
  receipt: 'Receipt',
  prev: '← Prev',
  next: 'Next →',

  // Summary
  nothingToSummariseTitle: 'Nothing to summarise yet',
  nothingToSummariseBody:
    "Once you've recorded some expenses, this shows the total, the per-head share, and who should pay whom.",
  perHeadLabel: 'Per head',
  people: 'People',
  entries: 'Entries',
  paidOfTotal: '{paid} paid · {outstanding} still to pay',
  stillToPay: 'Still to pay ({count})',
  outstanding: 'Outstanding',
  outstandingExplainer:
    'Owed to shops and contractors, not between members — so it is kept out of the settlement below until it is actually paid.',
  notRecorded: 'Not recorded',
  paidOfAmount: '{paid} of {total} paid',
  recordPayment: 'Record payment',
  whoOwesWhom: 'Who owes whom',
  allSquare: 'Everyone is square — nothing to settle. ✓',
  nothingBetweenMembers: 'Nothing to settle',
  nothingBetweenMembersEmphasis: 'between members',
  nothingBetweenMembersRest: '— but {amount} is still owed outside the group.',
  // Sits between the two names in a settlement row. Marathi needs
  // postpositions on both names for a verb to read naturally, so it uses an
  // arrow instead — the section heading already carries the meaning.
  paysConnector: 'pays',
  nPaymentsSettle: '{count} settles everyone up.',
  payments: '{count} payments',
  payments_one: '{count} payment',
  eachPerson: 'Each person',
  settled: 'Settled',
  gets: 'gets {amount}',
  owes: 'owes {amount}',
  paidLabel: 'Paid',
  shareLabel: 'Share',
  whereItWent: 'Where it went',

  // Record payment modal
  recordPaymentTitle: 'Record a payment',
  recordPaymentSubtitle: '{category} · {amount} outstanding',
  amountPaid: 'Amount paid',
  amountPaidMissing: 'Enter how much was paid.',
  onlyOutstanding: 'Only {amount} is outstanding on this expense.',
  couldNotSavePayment: 'Could not save that payment.',
  alreadyPaid: 'Already paid',
  undo: 'Undo',
  undoPaymentLabel: 'Undo payment of {amount}',

  // Settings
  backupIntro:
    'Everything is stored on this device only. Nothing is uploaded anywhere, and nothing syncs — so a backup file is the only copy that survives clearing your browser data or switching phones.',
  export: 'Export',
  exportBody:
    'Saves {crops}, all their expenses and any receipt photos as a JSON file. Keep it somewhere safe — email it to yourself, or drop it in cloud storage. Photos make the file much larger, so it may take a moment.',
  downloadBackup: 'Download backup',
  shareBackup: 'Share backup',
  backupShared: 'Backup shared.',
  sharedInsteadDownloaded:
    'Sharing was unavailable, so the backup was downloaded instead.',
  backupDownloaded: 'Backup downloaded.',
  backupFailed: 'Could not create the backup file.',
  import: 'Import',
  importBody1: 'Restores from a backup file.',
  importBodyEmphasis: 'This replaces everything currently on this device',
  importBody2: '— export first if you have data here you want to keep.',
  chooseBackupFile: 'Choose backup file',
  restored: 'Restored {crops}, {expenses}{photos}.',
  photosNotRestored:
    'Your crops and expenses are saved, but {photos} could not be stored on this device.',
  restoredPhotos: ' and {photos}',
  crops: '{count} crops',
  crops_one: '{count} crop',
  expenses: '{count} expenses',
  expenses_one: '{count} expense',
  members: '{count} members',
  members_one: '{count} member',
  bills: '{count} bills',
  bills_one: '{count} bill',

  // Language
  language: 'Language',
  languageBody: 'Choose the language used across the app.',

  // Version
  version: 'Version',
  builtOn: 'Built {date}',
  versionExplainer:
    'The app keeps a copy of itself on your device so it works offline, so a new version can take a moment to arrive. Check here if you are expecting a change and cannot see it.',
  shareFormat: 'Share format: {format}',
  shareFormatNone: 'not supported',
  checkForUpdates: 'Check for updates',
  checking: 'Checking…',
  noServiceWorker: 'This browser cannot check automatically — just reload.',
  noOfflineCopy: 'No offline copy is installed yet, so you are current.',
  updateReady: 'An update is ready — see the prompt at the bottom.',
  upToDate: 'You are on the latest version.',
  checkFailed: 'Could not check right now. Try again when online.',

  // Update prompt
  updateAvailable: 'Update available',
  updateAvailableBody:
    'A newer version of Crop Ledger is ready. Your data stays as it is.',
  reloadNow: 'Reload now',
  later: 'Later',

  // Theme
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',

  // Categories
  catSeeds: 'Seeds',
  catFertilizer: 'Fertilizer & pesticide',
  catLabour: 'Labour',
  catMachinery: 'Machinery & fuel',
  catIrrigation: 'Irrigation & electricity',
  catTransport: 'Transport & marketing',
  catLand: 'Land & rent',
  catCustom: 'Other',

  // Seasons (used to prefill the season field)
  seasonKharif: 'Kharif',
  seasonRabi: 'Rabi',
} as const

export type TranslationKey = keyof typeof en
