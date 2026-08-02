# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Commands

```bash
npm run dev       # dev server at localhost:5173/crop-ledger/
npm run build     # tsc -b && vite build && copy 404.html (what CI runs)
npm run test       # vitest — domain, data and store logic
npm run test:cloud # vitest against a real Firestore emulator (needs a JDK)
npm run test:e2e   # playwright — the real app in a browser
npm run test:all   # lint + unit + cloud + build + e2e, i.e. everything CI runs
npm run lint       # oxlint
```

**Run `npm run test:e2e` before pushing anything that touches a screen.** The
unit suite cannot see a broken one: every regression that reached a phone —
a form id that outlived one expense and overwrote the previous one, a Record
payment button missing from the list where it was needed, a tab claiming "no
expenses" while it loaded, a save that hung with no signal — typechecked and
passed every unit test. `e2e/` covers the flows those broke.

`e2e/app.ts` is the page object; specs speak in its terms so a layout change
breaks one method rather than thirty assertions. Rows carry `data-testid`
(`crop-row`, `expense-row`, `sale-row`, `person-row`, `transfer-row`) — keep
them when reworking a list. Assert with Playwright's retrying matchers
(`app.shows(...)`, `expect(locator)`), never a one-shot `innerText` snapshot:
read straight after a navigation, that captures the screen you just left.

`npm run build` runs `tsc -b` first, so a type error fails the build. Always
run it before pushing.

Cloud backup needs `VITE_FIREBASE_*` in `.env.local` (see `.env.local.example`).
Without them the app builds and runs device-local, which is a supported mode,
not a broken one.

## The one structural rule

**`src/domain/` is pure TypeScript — no React imports, no Dexie imports, no
browser APIs.** All money arithmetic lives there and is unit-tested directly.
React renders what it returns; the repository persists it. If you find yourself
importing a component or the database into `src/domain/`, the logic belongs
somewhere else.

Layers, outermost to innermost:

```
routes/ + components/   React, presentation only
store/useLedgerStore.ts Zustand; calls the repository, never Dexie directly
data/repository.ts      CropRepository interface + Dexie implementation
data/db.ts              Dexie schema
domain/                 pure logic, fully tested
```

## Money is integer paise, never floats

`Paise` is a branded-by-convention `number` meaning hundredths of a rupee.
Every amount in `types.ts`, every stored value, and every intermediate is an
integer count of paise. Rupee floats drift once you divide by three and add
back; for a ledger that has to reconcile exactly, that is a bug that only
surfaces after a season of entries.

Parse user input with `parseRupees()` (returns `null` for unusable input, so
"empty" is distinguishable from "zero"). Display with `formatINR()`. Never
call `Number(input) * 100` inline.

## Splits: who paid and who owes are independent

An `Expense` records money actually handed over (`payments`) separately from
who the cost belongs to (`owedBy`). This is deliberate and is what lets one
mechanism cover every case the app exists to handle:

- paid by one, shared by several → several ids in `owedBy`
- paid by one, owed wholly by another → exactly one id in `owedBy`, not a payer
- bought on credit → `payments` is empty; the split still applies
- part-paid, or paid in instalments by different people → several `payments`

There is no special-case branch for any of these. Do not add one.

`splitAmounts` present ⇒ custom per-member amounts, authoritative.
`splitAmounts` absent ⇒ equal division across `owedBy`.
**Always** go through `resolveSplit()` rather than re-deriving shares, so the
two modes can never be interpreted differently in two places. When switching
an expense back to an equal split, `delete expense.splitAmounts` — leaving
stale amounts behind silently changes the settlement.

`splitEqually()` allocates the remainder paise one each to the earliest
members in the given order, so a split always sums to exactly the total. This
is tested exhaustively; don't replace it with naive division.

## Two kinds of debt — never merge them

This distinction is what the credit feature rests on, and collapsing it gives
you a ledger that quietly stops balancing:

- **Between members** — `computeBalances()` / `minimizeTransfers()`. Reflects
  only money that has *actually changed hands*. Each member is debited their
  share of what has been **paid**, never of what is still owed to a shop.
  A `Settlement` clears this kind and only this kind: it is money one member
  handed another, so it must never reach `computeOutstanding()` — the shop is
  owed exactly what it was owed before two people squared up.
- **Outside the group** — `computeOutstanding()` in `domain/payments.ts`.
  Everything unpaid, optionally grouped by `owedTo`.

A part-payment covers everyone's share proportionally, via
`allocateProportionally()` — not one person's share in full. Charging unpaid
amounts to members would break the zero-sum invariant below and tell people to
pay each other for money nobody has spent yet.

`amountOutstanding()` clamps at zero so a mistyped over-payment cannot show as
negative debt or offset another expense, and `applyPayment()` trims a payment
that would overshoot rather than storing it.

## Settlement invariant

`computeBalances()` returns `paid − (share of what was paid)` per member.
**Balances always sum to zero**, including with credit and part-payments in
play. Any change to expense, payment or sale handling must preserve that — it
is the property the whole ledger rests on, and `settlement.test.ts` asserts it
directly.

`computeBalances(members, expenses, sales, settlements)` handles revenue and
settling up in the same pass. A settlement is a symmetric ±amount pair — the
payer credited, the receiver debited — so it preserves the zero-sum invariant
by construction rather than by care. It is deliberately **not** clamped to what
is owed: handing over more than the balance means the other member now owes the
difference, and clamping would silently lose money that changed hands.
`amountOutstanding()` clamps because a shop cannot owe you; a person can.

**Every consumer of `computeBalances` must pass settlements.** `statement.ts`
takes them as a *required* field for that reason — the printed sheet is the
copy that gets handed over, and one that omitted them would tell two people to
settle a debt they cleared last week.
A sale is arithmetically an inverted expense: the member who collected the cash
is debited the total, every member credited an equal share — so the collector
becomes the one who owes everybody, which is the correct end state. Mixed units
are never summed (`computeRevenue` returns a null quantity instead), because a
confident total of quintals plus kilos means nothing.

## Receipt photos never travel with the expense row

`Expense.receiptCount` is a number, nothing more. The images live in their own
`receipts` table keyed by `expenseId` and are fetched **only when someone opens
them** — from the expense form, or by tapping the 📷 badge in the list.

This split is the whole point: `listExpenses()` runs on every render of every
screen, and putting image data on those rows would drag megabytes through each
one. If you ever need "does this have a photo", read the count; never fetch
blobs to answer it.

Other invariants here:

- **Never put a Blob in IndexedDB.** `Receipt.image` is an `ArrayBuffer` plus a
  `mimeType`, and a Blob is rebuilt only for display in `useReceiptUrl`. iOS
  Safari fails to store a Blob built from raw bytes — *"Error preparing
  Blob/File data to be stored in object store"* — which broke restoring a
  backup on a phone while capturing a photo kept working, because a Blob
  straight from `canvas.toBlob()` happens to survive. Bytes are reliable
  everywhere; this is not a preference. `receiptBytes()` normalises the older
  Blob rows on read so upgrading devices keep working.
- `bytesToDataUrl` converts only at the backup boundary, and is built on
  `atob`/`btoa` rather than `FileReader` so it works in Node and stays
  directly testable.
- Everything goes through `compressImage()` first. Phone cameras produce 3–12 MB
  files and the quota is shared with the ledger itself. `MAX_EDGE` is
  deliberately 1600, not thumbnail-sized: the numbers on a bill have to stay
  readable.
- **Deleting an expense or a crop must delete its receipts in the same
  transaction.** Orphaned photos are invisible and unreclaimable — they just
  consume quota forever. `deleteExpense` and `deleteCrop` both do this.
- The expense form stages photos in component state and writes them only on
  save, so cancelling never leaves orphans, and a brand-new expense can collect
  photos before its row exists (hence the `draftId`).
- Object URLs must be revoked — use `useReceiptUrl`. A leak here pins every photo
  ever displayed in memory, which on a phone gets the tab killed.

## Marathi is the default language

`src/i18n/` holds a flat catalogue per language. `mr.ts` is typed as
`Record<keyof typeof en, string>`, so adding an English key without translating
it is a **build error** — that type annotation is the mechanism, don't loosen
it. `i18n.test.ts` additionally catches what types cannot: a Marathi value left
identical to its English source, and placeholders that differ between
languages.

- **`useT()` is memoised on the language — keep the `useCallback`.** An
  unstable `t` in a `useEffect` dependency array re-runs that effect on every
  render, and a form whose reset effect depends on `t` wipes each keystroke as
  it is typed. That shipped, and broke the crop form.
- **Never hardcode a user-visible string in a component.** Add a key and use
  `const t = useT()`. Category labels live in the domain layer as `labelKey`,
  resolved by the caller — `src/domain/` must not know what language the UI is
  in.
- **Pluralisation lives in the catalogue**, as `key` plus an optional `key_one`
  picked when `count === 1`. English suffix rules do not apply to Marathi, so
  there is no `pluralize()` helper any more.
- **Money always formats with `en-IN`**, in every language. `mr-IN` drops the
  Indian lakh grouping (₹120,000 instead of ₹1,20,000). Only *dates* take a
  locale, via `intlLocale()`, which appends `-u-nu-latn` so Marathi gets its
  month names with Latin digits — Devanagari digits would not match the figures
  printed on the shop's bill.
- The settlement row uses `paysConnector` between two names: "pays" in English,
  an arrow in Marathi, because Marathi needs postpositions on both names for a
  verb to read naturally. The section heading carries the meaning.
- The font stack names Devanagari faces explicitly. An unshaped conjunct is
  unreadable, not merely ugly.

## Backing up cannot happen automatically

There is no backup-on-close and there cannot be. Browsers block file saves
during unload, `beforeunload` may show only a generic dialog, and on iOS
closing a tab or swiping away a home-screen app often fires nothing at all. A
backup that silently fails to run is worse than none, because it would be
trusted. Don't add one.

What exists instead is `lib/share.ts`, handing the file to the OS share sheet
so it reaches iCloud Drive or WhatsApp in one tap. Rules there:

- **Probe with `canShare` before rendering the button.** Safari refuses some
  file types; the code retries as `text/plain` (the `.json` filename still
  saves correctly) and reports nothing shareable if neither is accepted.
- **Cancelling is not an error.** `AbortError` means the user chose to dismiss
  the sheet; say nothing.
- **Always fall back to a download.** Safari refuses the share if assembling a
  large backup outlasts the tap, which is likely with photos. The user must
  end up with the file either way.

## Two storage backends behind one interface

`CropRepository` (`data/repository.ts`) has two implementations, and no screen
knows which one is live:

- `dexieRepository` — IndexedDB on this device. The default, and the fallback
  for everything.
- `cloudRepository(uid)` (`data/cloudRepository.ts`) — Firestore under
  `users/{uid}/…`, mirroring the Dexie tables one for one so the two stay
  readable against each other and a backup file restores identically into
  either.

`useLedgerStore.setRepository(next, kind)` swaps them and re-reads everything;
`useSyncStore.connect/disconnect` is what calls it, driven by sign-in state
through the `useCloudSync()` hook mounted in `AppLayout`. Rules for this seam:

- **Everything Firebase is behind a dynamic `import()`.** `data/cloudConfig.ts`
  is the only cloud module safe to import statically — it holds the env vars
  and `isCloudConfigured()`, and touches no SDK. A static import anywhere else
  pulls ~155 KB gzipped into the first paint for a user who may never sign in.
- **An unconfigured build must still work.** Missing `VITE_FIREBASE_*` means
  the sign-in card and the header cloud icon do not render and the app is
  device-local, exactly as it was before sync. A forgotten CI secret must
  never be a blank screen.
- **A cloud failure falls back to the device, it does not block.**
  `useSyncStore.connect` catches, points the store back at Dexie and reports
  `error`. Losing the network must not cost the user access to their ledger.
- **First sign-in uploads, but never merges.** `decideUpload()` in
  `data/cloudSync.ts`: local rows and an empty account → upload; both sides
  hold data → `skip` and tell the user. Ids survive an export/restore round
  trip, so two ledgers descended from the same backup collide entry for entry
  and any automatic merge would overwrite the newer side. The local copy is
  never deleted after an upload.
- **`firestore.rules` is the source of truth but is not deployed by CI.** There
  is no Firebase CLI here; a change has to be pasted into Firebase Console →
  Firestore → Rules → Publish. The model is one line — a signed-in user reaches
  everything under their own `users/{uid}` and nothing else.
- **Receipt bytes cross the wire as Firestore `Bytes`,** and `fromStored()`
  copies the view (`.slice()`) rather than handing over `.buffer`, which can
  be a window onto a larger allocation.
- **Cloud writes resolve locally, never on server acknowledgement.** Firestore's
  `setDoc`/`deleteDoc`/`batch.commit()` promises only settle once the *server*
  has the write — with no signal they never settle at all. The store awaits
  every write before updating the screen, so this made recording a payment (or
  adding anything) in a field with no bars appear to do nothing. Every write in
  `cloudRepository` therefore goes through `queued()`, which returns as soon as
  Firestore has applied it to its own IndexedDB cache — real, durable storage
  that the SDK retries from until the server has it. A later server rejection
  is reported through `onWriteError` → `reportSyncFailure()`, because by then
  nothing on screen is waiting for it. **Do not "fix" this by awaiting the SDK
  promise.** `offlineWrite.emu.test.ts` proves the hang, against a real
  emulator with the network disabled, and CI's `cloud` job runs it on every
  push — reverting to an awaited SDK promise goes red. The one deliberate
  exception is
  `replaceAll` (restoring a backup), which still waits for the server so it can
  report how many photos actually failed.
- **A save updates the list in memory; it does not re-read.** `getDocs` always
  goes to the server and waits, even for rows already cached, so the old
  "write then re-read the collection" pattern put a network round trip on
  every save — and the first one of a sitting also paid for Firestore's
  connection handshake, which is the pause that got reported. The store now
  applies the row it just wrote via `upsertSorted`. That is only safe because
  `domain/order.ts` holds the comparators and **both repositories sort with
  them too**: if the in-memory order diverged from a read's, the list would
  reshuffle on the next load. Keep those three in step.
- **Opening a crop is a two-phase read.** `getDocs` waits on the server even
  when the same rows are cached locally, which is what made opening a crop
  pause. `cachedCropData()` — optional on the interface, implemented only by
  the cloud repository — answers from the cache so `openCrop` can paint at
  once, then the authoritative read overwrites it. It returns **null**, never
  empty arrays, when nothing is cached: the caller cannot tell "not stored
  yet" from "this crop has no expenses", and rendering the latter flashes a
  wrong answer. Both reads sort with the shared `byNewest`, or the list would
  reshuffle when the fresh copy lands.

## Storage still has to behave as if there were no server copy

Sync does not change the store's discipline, because the app is offline-first
and the cloud is frequently unreachable:

- **Write to storage before updating UI state.** The store awaits the repository
  and only then calls `set()`. An optimistic update that failed to persist is a
  lie the user discovers on reload. (Firestore's local cache resolves a write
  before it reaches the server, which is exactly what makes this still fast
  with no signal.)
- **Destructive actions need a confirmation that mentions the backup file**, since
  deleted data is genuinely unrecoverable.
- **Importing a backup replaces everything.** `parseBackup()` validates the whole
  file and refuses it entirely if any record is damaged — never partially apply
  a *damaged file*.
- **But the ledger and the photos commit in separate transactions.** They were
  one until a phone failed to store photos and took the whole restore down with
  it, leaving the user with nothing. A storage failure is not a damaged file:
  the crops and expenses are valid and irreplaceable, so they commit first and
  stay committed, and `replaceAll` reports `photosFailed` instead of throwing
  the ledger away with the images.

The `sales` table exists in Dexie schema version 1 despite being unused, so
adding revenue later needs no migration on devices that already hold data.
Version 3 added `receipts` and version 4 `settlements`, both purely additive.

A backup written before settling up existed has no `settlements` key at all,
and `parseBackup()` reads that as an empty list rather than refusing the file —
those backups are somebody's only copy. A settlement that *is* present but
missing a side is a damaged record and does fail the whole file, because a
half-recorded one would shift a balance with nothing on screen to explain it.

Removing a member is warned about by `countMemberEntries()`, which counts
settlements as well as expenses — someone who never paid for anything but was
handed money to square up still has history, and dropping one side of a
transfer while the other survives is what breaks the zero-sum sum.

**Never edit an existing `version(n).stores({...})` block** — devices holding
data upgrade by replaying the versions they have not seen, so rewriting an old
one means they never run the upgrade. Add a new block instead. Version 2 added
`payments` and dropped `paidBy`; `data/migrate.ts` does that conversion and is
deliberately idempotent, because it runs from two places: the Dexie upgrade
hook, and `parseBackup()` for backup files written before credit tracking
existed. A migration must leave existing balances *identical* — an upgrade that
silently restates last season's books is worse than no upgrade, and
`migrate.test.ts` asserts this.

## Ids for not-yet-saved rows must be minted per opening, not per mount

`ExpenseModal` needs an id before the expense exists, so its photos can be
keyed to it. That id lived in `useState(() => newId())` — which runs once per
*component instance*, and the add-modal is rendered permanently by
`ExpensesPage` with only `open` toggling. Two expenses added without leaving
the screen therefore shared an id, and the second **overwrote the first**.
Silent data loss, and intermittent-looking, because navigating between tabs
remounts the page and mints a fresh id.

The id is now regenerated in the open effect (`if (!editExpense)
setDraftId(newId())`), and staged receipts are re-stamped with the saved
expense's real id. If another form ever needs a pre-save id, do the same:
tie it to the opening, never to the mount. Everything else — `SaleModal`,
`CropModal`, `RecordPaymentModal`, member add — calls `newId()` at submit and
is safe by construction.

## Full-object writes

`saveCrop`/`saveExpense` put the whole document. Always spread the existing
object and override only what changed (`{ ...crop, archived }`) — building a
literal from form fields silently drops optional fields the form doesn't know
about. TypeScript cannot catch this, because optional fields make incomplete
literals typecheck.

## Styling

Earthy palette defined as CSS custom properties in `src/index.css`, with a
`[data-theme='dark']` block. Components use Tailwind arbitrary values —
`bg-[var(--surface)]`, `text-[var(--ink)]`, `border-[var(--hairline)]`. A
hardcoded hex will break dark mode, so never introduce one. Amounts carry the
`tnum` class for tabular figures so columns of money align.

Mobile-first: this is used standing in a field. Tap targets are ≥ 44px
(`min-h-11`), modals are bottom sheets on phones and centred cards from `sm:`
up. Radix Dialog handles focus trapping and escape — don't hand-roll a modal.

`tsconfig.app.json` enables `noUnusedLocals`, `noUnusedParameters`,
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. The last one means
an optional prop that callers pass `string | undefined` into must be declared
`error?: string | undefined`, not `error?: string`.

## Assets

`public/icon-*.png` are generated by `scripts/generate-icons.mjs` (a pure-Node
PNG encoder, no dependencies). Re-run `node scripts/generate-icons.mjs public`
after changing the artwork rather than hand-editing the binaries.

## Updates are prompted, never silent

The PWA runs `registerType: 'prompt'`, not `autoUpdate`. Under autoUpdate a
deploy swapped in silently on some later reload, so there was no way to tell a
stale cached app from a current one — which cost real debugging time. Now the
new worker waits and `UpdatePrompt` offers "Reload now".

Consequences to preserve:

- `injectRegister: null` in `vite.config.ts`. Registration happens once, in
  `UpdatePrompt` via `useRegisterSW`. Re-enabling the injected script would
  race it.
- The generated `sw.js` must keep `skipWaiting` **inside the `SKIP_WAITING`
  message listener** and must not call `clientsClaim` at top level. That is
  what makes the waiting worker wait. Verify after touching PWA config.
- `vite.config.ts` stamps `__APP_VERSION__` / `__BUILD_SHA__` /
  `__BUILD_TIME__`, surfaced in Settings via `lib/version.ts`. The SHA is what
  actually distinguishes two builds — keep it in any version display, and bump
  `package.json` version on a user-visible release.
- Updates are also re-checked hourly and whenever the tab becomes visible,
  because an installed PWA can sit backgrounded for days.

Never suggest "clear site data" to fix a stale app. It deletes the IndexedDB
ledger, which is the only copy. Reloading, or Settings → Check for updates, is
the fix.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on push to
`main`. `vite.config.ts` sets `base: '/crop-ledger/'` and the router uses
`basename: import.meta.env.BASE_URL`; both must agree. The build copies
`index.html` to `404.html` as the SPA fallback, without which a refresh on any
nested route 404s.
