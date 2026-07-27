import type { en } from './en'

/**
 * Marathi. Typed as the exact shape of `en`, so adding an English key without
 * translating it fails the build rather than leaking an English word into a
 * Marathi screen.
 *
 * Amounts stay in Latin digits with Indian grouping (₹1,20,000) — that is what
 * bills, bank messages and price boards use, so the figures stay scannable.
 * Only the words are translated.
 */
export const mr: Record<keyof typeof en, string> = {
  // Generic actions
  save: 'जतन करा',
  saveChanges: 'बदल जतन करा',
  saving: 'जतन करत आहे…',
  cancel: 'रद्द करा',
  delete: 'हटवा',
  remove: 'काढा',
  edit: 'बदला',
  add: 'जोडा',
  close: 'बंद करा',
  loading: 'लोड होत आहे…',
  optional: 'ऐच्छिक',
  somethingWentWrong: 'काहीतरी चूक झाली.',
  storageFull:
    'जतन करता आले नाही. तुमच्या ब्राउझरमध्ये जागा शिल्लक नसावी.',

  // Crops list
  appTagline: 'प्रत्येक पिकाचा खर्च आणि कोणाला किती देणे आहे ते पाहा.',
  growing: 'सुरू असलेली पिके',
  newCrop: '+ नवीन पीक',
  noCropsTitle: 'अजून एकही पीक नाही',
  noCropsBody:
    'या हंगामात तुम्ही घेत असलेले पीक जोडून सुरुवात करा. त्यानंतर सहभागी व्यक्ती आणि त्यांचा खर्च जोडता येईल.',
  addFirstCrop: 'पहिले पीक जोडा',
  allArchived:
    'सर्व पिके संग्रहित आहेत. खालून एखादे परत आणा, किंवा नवीन पीक जोडा.',
  archivedSection: 'कापणी झालेली व संग्रहित',
  archived: 'संग्रहित',
  backupAndRestore: 'बॅकअप व पुनर्संचयन',
  allCrops: '← सर्व पिके',

  // Crop modal
  editCrop: 'पीक बदला',
  cropTitle: 'नवीन पीक',
  cropName: 'पीक',
  cropNamePlaceholder: 'कापूस, सोयाबीन, ऊस…',
  cropNameMissing: 'पिकाला नाव द्या.',
  season: 'हंगाम',
  seasonHint:
    'यामुळे पुढच्या वर्षी तेच पीक घेतले तरी दोन्हींची गल्लत होणार नाही.',
  sowingDate: 'पेरणीची तारीख',
  harvestDate: 'कापणीची तारीख',
  endBeforeStart: 'शेवटची तारीख सुरुवातीच्या तारखेच्या आधीची आहे.',
  createCrop: 'पीक तयार करा',

  // Crop layout
  cropNotFound: 'पीक सापडले नाही',
  cropNotFoundBody: 'ते या फोनवरून हटवले गेले असावे.',
  backToCrops: 'पिकांकडे परत',
  archive: 'संग्रहित करा',
  restore: 'परत आणा',
  tabExpenses: 'खर्च',
  tabPeople: 'व्यक्ती',
  tabSummary: 'सारांश',
  cropSections: 'पिकाचे विभाग',
  deleteCropTitle: '{name} हटवायचे?',
  deleteCropDescription: 'यासोबत त्यावरील सर्व खर्चही हटवले जातील.',
  deleteCropBody:
    'हे पूर्ववत करता येणार नाही, आणि ही माहिती फक्त याच फोनवर आहे. पुन्हा लागण्याची शक्यता असेल तर अगोदर बॅकअप व पुनर्संचयन मधून बॅकअप घ्या.',

  // Members
  addSomeone: 'व्यक्ती जोडा',
  name: 'नाव',
  duplicateMember: 'या नावाचा सदस्य आधीच या पिकात आहे.',
  noMembersTitle: 'अजून कोणीही जोडलेले नाही',
  noMembersBody:
    'या पिकात सहभागी असलेल्या सर्वांना जोडा. प्रत्येक खर्च कोणी दिला आणि कोणावर आहे, हे याच यादीतून निवडाल.',
  noExpensesYet: 'अजून खर्च नाही',
  onNExpenses: '{count} वर',
  rename: 'नाव बदला',
  renameMember: '{name} यांचे नाव बदला',
  removeMember: '{name} यांना काढा',
  removeMemberTitle: '{name} यांना काढायचे?',
  removeMemberWarning:
    'ते {count} मध्ये आहेत. त्यांना काढल्यास ते खर्च तसेच राहतील, पण त्यांचा वाटा हिशोबातून वगळला जाईल आणि प्रत्येकाचे देणे बदलेल. अगोदर हिशोब पूर्ण करणे बरे.',
  removeMemberSafe: 'ते कोणत्याही खर्चात नाहीत, त्यामुळे बाकी काही बदलणार नाही.',

  // Expenses list
  addPeopleFirstTitle: 'अगोदर व्यक्ती जोडा',
  addPeopleFirstBody:
    'खर्चासाठी तो कोणी दिला आणि कोणावर आहे हे लागते, म्हणून अगोदर या पिकात सहभागी व्यक्ती जोडा.',
  addPeople: 'व्यक्ती जोडा',
  totalSpent: 'एकूण खर्च',
  perHead: 'दरडोई {amount}',
  stillToPayShort: '{amount} अजून द्यायचे',
  addShort: '+ जोडा',
  noExpensesTitle: 'अजून खर्च नाही',
  noExpensesBody:
    'या पिकावर काय खर्च झाला — बियाणे, मजुरी, इंधन — आणि तो कोणी दिला ते नोंदवा.',
  addFirstExpense: 'पहिला खर्च जोडा',
  searchExpenses: 'नोंद किंवा प्रकार शोधा',
  nothingMatches: 'याच्याशी जुळणारे काही नाही.',
  pendingFilter: 'बाकी ({count})',
  unpaid: 'दिलेले नाही',
  memberPaid: '{name} यांनी दिले',
  nPartPayments: '{count} हप्ते',
  owesItAll: 'पूर्ण रक्कम {name} यांच्यावर',
  splitNWays: '{count} जणांत वाटणी',
  splitNWaysCustom: '{count} जणांत वाटणी (स्वतःची)',
  amountPending: '{amount} बाकी',
  removedMember: 'काढलेला सदस्य',
  viewReceipt: 'पावती',
  viewNPhotos: '{count} फोटो',
  deleteExpenseTitle: 'हा खर्च हटवायचा?',
  deleteExpenseBody:
    '{amount} या पिकाच्या एकूण खर्चातून वजा होतील आणि हिशोब पुन्हा मोजला जाईल.',

  // Expense form
  addExpense: 'खर्च जोडा',
  editExpense: 'खर्च बदला',
  amount: 'रक्कम',
  category: 'प्रकार',
  categoryName: 'प्रकाराचे नाव',
  categoryNamePlaceholder: 'उदा. पीक विमा',
  categoryNameMissing: 'प्रकाराला नाव द्या.',
  amountMissing: 'रक्कम भरा.',
  paidQuestion: 'पैसे दिले?',
  paidInFull: 'पूर्ण दिले',
  partlyPaid: 'काही दिले',
  onCredit: 'उधार',
  paidBy: 'कोणी दिले',
  paidByMissing: 'कोणी दिले ते निवडा.',
  paidSoFar: 'आतापर्यंत दिलेले',
  paidSoFarMissing: 'आतापर्यंत किती दिले ते भरा.',
  partCoversAll: 'ही पूर्ण रक्कम आहे — त्याऐवजी “पूर्ण दिले” निवडा.',
  stillOutstanding:
    '{amount} बाकी राहील — नंतर त्यावरचे हप्ते नोंदवता येतील.',
  owedTo: 'कोणाला देणे',
  owedToPlaceholder: 'दुकान, व्यापारी किंवा मुकादम (ऐच्छिक)',
  manyPaymentsNote:
    'या खर्चावर अनेक हप्ते नोंदलेले आहेत. ते सारांश मधील बाकी यादीतून हाताळा.',
  whoOwes: 'कोणावर आहे',
  everyone: 'सर्व',
  clear: 'रिकामे करा',
  whoOwesMissing: 'हा खर्च कोणावर आहे ते निवडा.',
  paidButOwed: '{payer} यांनी दिले, पण पूर्ण रक्कम {ower} यांच्यावर आहे.',
  split: 'वाटणी',
  equally: 'समान',
  customAmounts: 'स्वतःच्या रकमा',
  eachAmount: 'प्रत्येकी {amount}',
  eachAmountRounded:
    'प्रत्येकी {amount} (सुरुवातीच्या काहींना एक पैसा जास्त, म्हणजे बेरीज अचूक जुळते)',
  amountFor: '{name} यांची रक्कम',
  splitOverBy: '{amount} जास्त',
  splitLeftToAssign: '{amount} वाटायचे बाकी',
  splitAddsUp: 'बेरीज जुळली ✓',
  splitOverError: 'वाटणी {amount} ने जास्त आहे.',
  splitShortError: '{amount} अजून वाटलेले नाहीत.',
  date: 'तारीख',
  notes: 'नोंद',
  notesPlaceholder: 'ऐच्छिक — बिल क्रमांक, दुकान, लक्षात ठेवण्यासारखे काही',

  // Receipts
  receipts: 'पावत्या',
  takePhoto: '📷 फोटो काढा',
  choosePhoto: '🖼️ फोटो निवडा',
  adding: 'जोडत आहे…',
  photosHint: 'फोटो जतन करण्याआधी लहान केले जातात आणि याच फोनवर राहतात.',
  photosStored: '{photos} · लहान केल्यावर {size}. फक्त याच फोनवर जतन.',
  photos: '{count} फोटो',
  photos_one: '{count} फोटो',
  notImages: '{count} फाइल फोटो नव्हत्या',
  couldNotRead: '{count} वाचता आल्या नाहीत',
  viewReceiptLabel: 'पावती पाहा',
  removeReceipt: 'पावती काढा',
  closeReceipt: 'पावती बंद करा',
  receiptOf: '{total} पैकी {current}',
  receipt: 'पावती',
  prev: '← मागील',
  next: 'पुढील →',

  // Summary
  nothingToSummariseTitle: 'अजून सारांश देण्यासारखे काही नाही',
  nothingToSummariseBody:
    'काही खर्च नोंदवल्यावर इथे एकूण रक्कम, दरडोई वाटा आणि कोणी कोणाला किती द्यायचे ते दिसेल.',
  perHeadLabel: 'दरडोई',
  people: 'व्यक्ती',
  entries: 'नोंदी',
  paidOfTotal: '{paid} दिले · {outstanding} अजून द्यायचे',
  stillToPay: 'अजून द्यायचे ({count})',
  outstanding: 'बाकी',
  outstandingExplainer:
    'हे दुकान व मुकादमाला देणे आहे, सदस्यांमधले नाही — म्हणून प्रत्यक्ष दिले जाईपर्यंत ते खालच्या हिशोबात धरलेले नाही.',
  notRecorded: 'नोंदवलेले नाही',
  paidOfAmount: '{total} पैकी {paid} दिले',
  recordPayment: 'हप्ता नोंदवा',
  whoOwesWhom: 'कोणी कोणाला द्यायचे',
  allSquare: 'सर्वांचा हिशोब पूर्ण — काही बाकी नाही. ✓',
  nothingBetweenMembers: 'हिशोब पूर्ण',
  nothingBetweenMembersEmphasis: 'सदस्यांमध्ये',
  nothingBetweenMembersRest: '— पण बाहेर {amount} अजून देणे आहे.',
  paysConnector: '→',
  nPaymentsSettle: '{count} मध्ये सर्वांचा हिशोब पूर्ण होतो.',
  payments: '{count} व्यवहार',
  payments_one: '{count} व्यवहार',
  eachPerson: 'प्रत्येक व्यक्ती',
  settled: 'हिशोब पूर्ण',
  gets: '{amount} मिळणार',
  owes: '{amount} देणे',
  paidLabel: 'दिले',
  shareLabel: 'वाटा',
  whereItWent: 'खर्च कुठे झाला',

  // Record payment modal
  recordPaymentTitle: 'हप्ता नोंदवा',
  recordPaymentSubtitle: '{category} · {amount} बाकी',
  amountPaid: 'दिलेली रक्कम',
  amountPaidMissing: 'किती दिले ते भरा.',
  onlyOutstanding: 'या खर्चावर फक्त {amount} बाकी आहेत.',
  couldNotSavePayment: 'हा हप्ता जतन करता आला नाही.',
  alreadyPaid: 'आधी दिलेले',
  undo: 'रद्द करा',
  undoPaymentLabel: '{amount} चा हप्ता रद्द करा',

  // Settings
  backupIntro:
    'सर्व माहिती फक्त याच फोनवर साठवली जाते. कुठेही अपलोड होत नाही आणि सिंक होत नाही — त्यामुळे ब्राउझरचा डेटा पुसला किंवा फोन बदलला तर बॅकअप फाइल हीच एकमेव प्रत उरते.',
  export: 'बॅकअप घ्या',
  exportBody:
    '{crops}, त्यांचे सर्व खर्च आणि पावत्यांचे फोटो एका JSON फाइलमध्ये जतन करते. ती सुरक्षित ठेवा — स्वतःला ईमेल करा किंवा क्लाउडवर ठेवा. फोटोंमुळे फाइल बरीच मोठी होते, त्यामुळे थोडा वेळ लागू शकतो.',
  downloadBackup: 'बॅकअप डाउनलोड करा',
  backupDownloaded: 'बॅकअप डाउनलोड झाला.',
  backupFailed: 'बॅकअप फाइल तयार करता आली नाही.',
  import: 'परत आणा',
  importBody1: 'बॅकअप फाइलमधून माहिती परत आणते.',
  importBodyEmphasis: 'यामुळे या फोनवरील सर्व माहिती बदलली जाईल',
  importBody2: '— इथली माहिती ठेवायची असेल तर अगोदर बॅकअप घ्या.',
  chooseBackupFile: 'बॅकअप फाइल निवडा',
  restored: '{crops}, {expenses}{photos} परत आणले.',
  restoredPhotos: ' आणि {photos}',
  crops: '{count} पिके',
  crops_one: '{count} पीक',
  expenses: '{count} खर्च',
  expenses_one: '{count} खर्च',
  members: '{count} सदस्य',
  members_one: '{count} सदस्य',
  bills: '{count} बिले',
  bills_one: '{count} बिल',

  // Language
  language: 'भाषा',
  languageBody: 'ॲपमध्ये वापरायची भाषा निवडा.',

  // Version
  version: 'आवृत्ती',
  builtOn: '{date} रोजी तयार',
  versionExplainer:
    'ॲप स्वतःची एक प्रत तुमच्या फोनवर ठेवते म्हणजे इंटरनेटशिवायही चालते, त्यामुळे नवीन आवृत्ती यायला थोडा वेळ लागू शकतो. एखादा बदल दिसत नसेल तर इथे तपासा.',
  checkForUpdates: 'नवीन आवृत्ती तपासा',
  checking: 'तपासत आहे…',
  noServiceWorker: 'हा ब्राउझर आपोआप तपासू शकत नाही — फक्त पुन्हा लोड करा.',
  noOfflineCopy: 'अजून ऑफलाइन प्रत नाही, त्यामुळे तुमच्याकडे नवीनच आहे.',
  updateReady: 'नवीन आवृत्ती तयार आहे — खालची सूचना पाहा.',
  upToDate: 'तुमच्याकडे नवीनतम आवृत्ती आहे.',
  checkFailed: 'आत्ता तपासता आले नाही. इंटरनेट आल्यावर पुन्हा प्रयत्न करा.',

  // Update prompt
  updateAvailable: 'नवीन आवृत्ती उपलब्ध',
  updateAvailableBody:
    'Crop Ledger ची नवीन आवृत्ती तयार आहे. तुमची माहिती जशीच्या तशी राहील.',
  reloadNow: 'आत्ता पुन्हा लोड करा',
  later: 'नंतर',

  // Theme
  switchToLight: 'उजळ रंगसंगतीवर जा',
  switchToDark: 'गडद रंगसंगतीवर जा',

  // Categories
  catSeeds: 'बियाणे',
  catFertilizer: 'खत व कीटकनाशक',
  catLabour: 'मजुरी',
  catMachinery: 'अवजारे व इंधन',
  catIrrigation: 'पाणी व वीज',
  catTransport: 'वाहतूक व विक्री',
  catLand: 'जमीन व भाडे',
  catCustom: 'इतर',

  // Seasons
  seasonKharif: 'खरीप',
  seasonRabi: 'रब्बी',
}
