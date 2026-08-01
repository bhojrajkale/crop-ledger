# Crop Ledger

Manage crop expenses and revenue settlements.

Track farm expenses by crop, split them between the people involved, and see
who owes whom at the end of the season. Built as an offline-first single-page
app: it keeps working with no signal, and syncs to your Google account when
there is one.

## What it does

- **Crops** — one record per crop cycle (e.g. Cotton, Kharif 2026), so the same
  crop can repeat across seasons without mixing up the books. Finished crops
  can be archived and still viewed.
- **People** — add everyone involved in a crop. No accounts or sign-ins; they
  are names used for splitting.
- **Expenses** — amount, category, date and notes, plus **who paid** and **who
  owes it**, tracked independently. That covers the ordinary case (one person
  pays, several share it) and the case where one person pays but somebody else
  owes the whole amount. Splits can be equal or custom amounts.
- **Credit** — an expense can be recorded unpaid or part-paid, with an optional
  note of who it is owed to. It counts towards the crop's total straight away
  and stays in a pending list until cleared. Payments can be recorded later, in
  instalments, by any member.
- **Receipts** — attach photos of bills to an expense, several if a bill runs
  to more than one page. They are shrunk before saving and open full screen
  from the expense list.
- **Harvest** — record each sale with quantity, unit, rate and who collected
  the money. Revenue is divided equally between everyone on the crop.
- **Summary** — total spent, revenue, profit or loss, per-head share, what is
  still to pay and to whom, what each person paid versus their share, spend by
  category, and the shortest list of payments that settles everyone up.
- **Cloud backup** — sign in with Google and the ledger, receipt photos
  included, is kept in your account instead of only on the phone. It opens on
  any device you sign in to, and survives losing or replacing the phone.
  Entries you make with no signal are saved locally and go up when the
  connection returns.
- **Backup file** — export everything, receipt photos included, to a JSON file
  and restore it on another device.
- **Marathi** — the app is in Marathi by default, with English available from
  Backup & restore. Amounts stay in familiar figures (₹1,20,000) in both.

Money owed to a shop is kept separate from money members owe each other, so
the settlement only ever covers what has actually changed hands.

## Running it

```bash
npm install
cp .env.local.example .env.local   # fill in for cloud backup, or leave blank
npm run dev                        # http://localhost:5173/crop-ledger/
```

Without `.env.local` the app runs device-local: sign-in is hidden and
everything is stored in the browser. That is a supported mode, not a broken
one.

## Commands

```bash
npm run dev        # dev server
npm run build      # tsc -b && vite build (what CI runs)
npm run test       # vitest
npm run test:cloud # vitest against a real Firestore emulator (needs a JDK)
npm run test:e2e   # playwright, against the app in a browser
npm run lint       # oxlint
npm run preview    # preview the production build
```

`npm run build` typechecks before bundling, so a type error fails the build.
Run it before pushing.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. The app is served from the `/crop-ledger/`
subpath, which `vite.config.ts` and the router basename both depend on.

## Firebase setup

One-time, in the [Firebase Console](https://console.firebase.google.com):

1. Create a project, then add a **Web app** to it and copy the config values
   into `.env.local` and into the repository's Actions secrets (Settings →
   Secrets and variables → Actions), using the names in
   `.env.local.example`.
2. **Authentication → Sign-in method** → enable **Google**.
3. **Authentication → Settings → Authorized domains** → add
   `bhojrajkale.github.io`. Sign-in fails silently without this.
4. **Firestore Database → Create database**, in production mode.
5. **Firestore → Rules** → paste the contents of `firestore.rules` and
   publish. There is no Firebase CLI in this project, so the file in the repo
   is a record of what should be published, not something that deploys itself.

## A note on your data

Signed in, the ledger lives in your Google account and this device keeps a
cached copy so it works with no signal. Signed out, it lives only in this
browser's IndexedDB — clearing site data or losing the device loses it.

Either way, **Backup & restore** exports the whole ledger, photos included, to
a single JSON file. It is worth taking one occasionally: it is readable on its
own, and it is what you would restore from if an entry were deleted by
mistake.
