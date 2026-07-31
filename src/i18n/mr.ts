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
    'हे पूर्ववत करता येणार नाही. पुन्हा लागण्याची शक्यता असेल तर अगोदर बॅकअप व पुनर्संचयन मधून बॅकअप घ्या.',

  // Members
  addSomeone: 'व्यक्ती जोडा',
  name: 'नाव',
  duplicateMember: 'या नावाची व्यक्ती आधीच या पिकात आहे.',
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
  removedMember: 'काढलेली व्यक्ती',
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

  // Harvest
  tabHarvest: 'कापणी',
  noSalesTitle: 'अजून विक्री झाली नाही',
  noSalesBody:
    'पीक विकल्यावर किती माल गेला आणि किती भाव मिळाला ते नोंदवा. ती रक्कम मग पिकातील सर्वांमध्ये समान वाटली जाते.',
  addFirstSale: 'पहिली विक्री नोंदवा',
  addSale: 'विक्री नोंदवा',
  editSale: 'विक्री बदला',
  deleteSaleTitle: 'ही विक्री हटवायची?',
  deleteSaleBody:
    '{amount} या पिकाच्या उत्पन्नातून वजा होतील आणि हिशोब पुन्हा मोजला जाईल.',
  quantity: 'माल',
  quantityMissing: 'किती माल विकला ते भरा.',
  unit: 'एकक',
  unitQuintal: 'क्विंटल',
  unitKg: 'किलो',
  unitTonne: 'टन',
  unitBag: 'पोते',
  ratePerUnit: 'प्रति {unit} भाव',
  rateMissing: 'भाव भरा.',
  saleTotal: 'एकूण',
  receivedBy: 'पैसे कोणाकडे आले',
  receivedByMissing: 'पैसे कोणाकडे आले ते निवडा.',
  buyer: 'खरेदीदार',
  buyerPlaceholder: 'व्यापारी किंवा बाजार (ऐच्छिक)',
  totalRevenue: 'उत्पन्न',
  revenuePerHead: 'प्रत्येकी {amount}',
  soldQuantity: '{amount} {unit}, सरासरी भाव {rate}',
  netProfit: 'नफा',
  netLoss: 'तोटा',
  netExplainer: 'उत्पन्न {revenue} वजा खर्च {expenses}.',
  holdingAmount: '{amount} जवळ आहेत',
  revenueNotSettled:
    'अजून कोणतीही विक्री नोंदलेली नाही, त्यामुळे वाटायला उत्पन्न नाही.',

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
    'हे दुकान व मुकादमाला देणे आहे, व्यक्तींमधले नाही — म्हणून प्रत्यक्ष दिले जाईपर्यंत ते खालच्या हिशोबात धरलेले नाही.',
  notRecorded: 'नोंदवलेले नाही',
  paidOfAmount: '{total} पैकी {paid} दिले',
  recordPayment: 'हप्ता नोंदवा',
  whoOwesWhom: 'कोणी कोणाला द्यायचे',
  allSquare: 'सर्वांचा हिशोब पूर्ण — काही बाकी नाही. ✓',
  nothingBetweenMembers: 'हिशोब पूर्ण',
  nothingBetweenMembersEmphasis: 'व्यक्तींमध्ये',
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

  // हिशेब कसा झाला
  howWorkedOut: 'हा हिशेब कसा झाला',
  explainBalance: 'कसे?',
  breakdownPaidOut: 'खर्चासाठी दिलेले',
  breakdownExpenseShare: 'खर्चातील त्यांचा वाटा',
  breakdownRevenueShare: 'उत्पन्नातील त्यांचा वाटा',
  breakdownRevenueHeld: 'त्यांच्याकडे आलेले विक्रीचे पैसे',
  breakdownGets: 'त्यांना मिळणार',
  breakdownOwes: 'त्यांनी द्यायचे',
  breakdownHoldingNote:
    'यातले बहुतेक त्यांचे देणे नाही — विक्रीचे {amount} त्यांच्याकडे आहेत, जे सर्वांचे आहेत.',

  // Exporting a season's accounts
  shareAccounts: 'हा हिशेब शेअर करा',
  shareAccountsBody:
    'या पिकाला आलेला संपूर्ण खर्च, मिळालेले उत्पन्न आणि कोणी कोणाला किती द्यायचे — हे सर्व एका कागदावर. ॲप न वापरणाऱ्या सहभागी व्यक्तींनाही देता येईल.',
  printStatement: 'छापा / PDF म्हणून जतन करा',
  downloadSpreadsheet: 'एक्सेल फाइल घ्या',
  generatedOn: '{date} रोजी तयार',
  printBlocked:
    'ब्राउझरने छपाईची खिडकी अडवली. या साइटसाठी पॉप-अप सुरू करून पुन्हा प्रयत्न करा.',
  spreadsheetSaved: 'फाइल डाउनलोड झाली.',
  exportFailed: 'ती फाइल तयार करता आली नाही.',
  columnPaid: 'दिलेले',
  columnShare: 'वाटा',
  columnReceived: 'मिळालेले',
  columnBalance: 'शिल्लक',
  columnFrom: 'कोणाकडून',
  columnTo: 'कोणाला',
  stillToPayPlain: 'अजून द्यायचे',

  // Cloud backup
  cloudSync: 'क्लाउड बॅकअप',
  cloudSyncOffBody:
    'Google ने साइन इन करा, म्हणजे हिशेब फक्त याच फोनवर न राहता तुमच्या खात्यात जतन होईल. मग तो कोणत्याही डिव्हाइसवर साइन इन करून उघडता येईल, आणि फोन हरवला किंवा बदलला तरी टिकून राहील.',
  cloudSyncOnBody:
    'हिशेब तुमच्या Google खात्यात जतन होत आहे. तुम्ही केलेले बदल लगेच जतन होतात आणि नेटवर्क मिळताच खात्यात जातात — त्यामुळे शेतात नेटवर्क नसतानाही खर्च भरता येतो.',
  signInWithGoogle: 'Google ने साइन इन करा',
  signingIn: 'साइन इन करत आहे…',
  signedInAs: '{name} म्हणून साइन इन केले आहे',
  signOut: 'साइन आउट करा',
  signOutBody:
    'साइन आउट केल्यावरही हिशेब तुमच्या खात्यात सुरक्षित राहतो. पुन्हा साइन इन करेपर्यंत हा फोन त्याची स्वतःची प्रत दाखवेल.',
  signInFailed: 'साइन इन करता आले नाही. नेटवर्क तपासून पुन्हा प्रयत्न करा.',
  signOutFailed: 'आत्ता साइन आउट करता आले नाही.',
  cloudConnecting: 'तुमच्या खात्याशी जोडत आहे…',
  cloudUploading: 'या फोनवरील हिशेब तुमच्या खात्यात नेत आहे…',
  cloudReady: 'तुमच्या खात्यात जतन झाले.',
  cloudErrorStatus:
    'तुमच्या खात्यापर्यंत पोहोचता आले नाही, त्यामुळे या फोनवरील प्रत दाखवत आहे. तुम्ही भरलेले इथेच जतन होते — नेटवर्क मिळाल्यावर पुन्हा साइन इन करा.',
  cloudOfflineStatus: 'साइन इन केलेले नाही — हिशेब फक्त याच फोनवर आहे.',
  cloudUploaded: '{crops} आणि {expenses} तुमच्या खात्यात नेले.',
  cloudUploadedPhotos: '{crops}, {expenses} आणि {photos} तुमच्या खात्यात नेले.',
  cloudPhotosFailed: '{photos} अपलोड करता आले नाहीत.',
  cloudLocalCopyKept:
    'तुमच्या खात्यात अगोदरच हिशेब होता, तोच दाखवत आहे. या फोनवरील प्रत तशीच ठेवली आहे — तीच वापरायची असेल तर बॅकअप फाइलमधून परत आणा.',
  syncFailed:
    'काही बदल तुमच्या खात्यात जतन करता आले नाहीत. ते या फोनवर सुरक्षित आहेत — नेटवर्क तपासा, किंवा साइन आउट करून पुन्हा साइन इन करा.',
  cloudStatusLabel: 'क्लाउड बॅकअपची स्थिती',
  dismiss: 'बंद करा',

  // Settings
  backupIntroCloud:
    'हिशेब तुमच्या Google खात्यात ठेवला जातो. तरीही अधूनमधून बॅकअप फाइल घेणे उपयोगाचे — ती स्वतंत्रपणे वाचता येते, आणि चुकून काही हटले तर तिच्यातूनच परत आणता येते.',
  backupIntro:
    'सर्व माहिती फक्त याच फोनवर साठवली जाते. कुठेही अपलोड होत नाही आणि सिंक होत नाही — त्यामुळे ब्राउझरचा डेटा पुसला किंवा फोन बदलला तर बॅकअप फाइल हीच एकमेव प्रत उरते.',
  export: 'बॅकअप घ्या',
  exportBody:
    '{crops}, त्यांचे सर्व खर्च आणि पावत्यांचे फोटो एका JSON फाइलमध्ये जतन करते. ती सुरक्षित ठेवा — स्वतःला ईमेल करा किंवा क्लाउडवर ठेवा. फोटोंमुळे फाइल बरीच मोठी होते, त्यामुळे थोडा वेळ लागू शकतो.',
  downloadBackup: 'बॅकअप डाउनलोड करा',
  shareBackup: 'बॅकअप शेअर करा',
  backupShared: 'बॅकअप शेअर झाला.',
  sharedInsteadDownloaded:
    'शेअर करता आले नाही, म्हणून बॅकअप डाउनलोड केला.',
  backupDownloaded: 'बॅकअप डाउनलोड झाला.',
  backupFailed: 'बॅकअप फाइल तयार करता आली नाही.',
  import: 'परत आणा',
  importBody1: 'बॅकअप फाइलमधून माहिती परत आणते.',
  importBodyEmphasis: 'यामुळे या फोनवरील सर्व माहिती बदलली जाईल',
  importBody2: '— इथली माहिती ठेवायची असेल तर अगोदर बॅकअप घ्या.',
  chooseBackupFile: 'बॅकअप फाइल निवडा',
  restored: '{crops}, {expenses}{photos} परत आणले.',
  photosNotRestored:
    'तुमची पिके व खर्च जतन झाले, पण {photos} या फोनवर साठवता आले नाहीत.',
  restoredPhotos: ' आणि {photos}',
  crops: '{count} पिके',
  crops_one: '{count} पीक',
  expenses: '{count} खर्च',
  expenses_one: '{count} खर्च',
  // व्यक्ती, not सदस्य — one word for the people on a crop, matching the tab.
  // The key stays `members` because the domain type is Member[]; only the
  // word the user reads is unified.
  members: '{count} व्यक्ती',
  members_one: '{count} व्यक्ती',
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
  shareFormat: 'शेअर स्वरूप: {format}',
  shareFormatNone: 'उपलब्ध नाही',
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
