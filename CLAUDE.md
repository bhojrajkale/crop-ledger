# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Commands

```bash
npm run dev       # dev server at localhost:5173/crop-ledger/
npm run build     # tsc -b && vite build && copy 404.html (what CI runs)
npm run test      # vitest
npm run lint      # oxlint
```

`npm run build` runs `tsc -b` first, so a type error fails the build. Always
run it before pushing.

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

`computeBalances(members, expenses, sales)` takes an optional third argument
that is still unused. A sale is arithmetically an inverted expense: the member
who collected the cash is debited the total, every member credited an equal
share. Revenue is therefore a form and a screen, not a change to the engine.

## Storage is device-local and has no server copy

There is no cloud backup and no sync. Consequences that keep biting if
forgotten:

- **Write to storage before updating UI state.** The store awaits the repository
  and only then calls `set()`. An optimistic update that failed to persist is a
  lie the user discovers on reload, with no server copy to reconcile against.
- **Destructive actions need a confirmation that mentions the backup file**, since
  deleted data is genuinely unrecoverable.
- **Importing a backup replaces everything.** `parseBackup()` validates the whole
  file and refuses it entirely if any record is damaged — never partially apply
  an import.

The `sales` table exists in Dexie schema version 1 despite being unused, so
adding revenue later needs no migration on devices that already hold data.

**Never edit an existing `version(n).stores({...})` block** — devices holding
data upgrade by replaying the versions they have not seen, so rewriting an old
one means they never run the upgrade. Add a new block instead. Version 2 added
`payments` and dropped `paidBy`; `data/migrate.ts` does that conversion and is
deliberately idempotent, because it runs from two places: the Dexie upgrade
hook, and `parseBackup()` for backup files written before credit tracking
existed. A migration must leave existing balances *identical* — an upgrade that
silently restates last season's books is worse than no upgrade, and
`migrate.test.ts` asserts this.

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
