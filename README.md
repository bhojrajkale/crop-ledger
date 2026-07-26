# Crop Ledger

Manage crop expenses and revenue settlements.

Track farm expenses by crop, split them between the people involved, and see
who owes whom at the end of the season. Built as an offline-first single-page
app — all data lives on your device, with no account and no server.

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
- **Summary** — total spent, per-head share, what is still to pay and to whom,
  what each person paid versus their share, spend by category, and the shortest
  list of payments that settles everyone up.
- **Backup** — export everything to a JSON file and restore it on another
  device.

Money owed to a shop is kept separate from money members owe each other, so
the settlement only ever covers what has actually changed hands.

Recording harvest revenue and dividing it between members is planned next; the
data model and settlement engine already account for it.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173/crop-ledger/
```

## Commands

```bash
npm run dev       # dev server
npm run build     # tsc -b && vite build (what CI runs)
npm run test      # vitest
npm run lint      # oxlint
npm run preview   # preview the production build
```

`npm run build` typechecks before bundling, so a type error fails the build.
Run it before pushing.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. The app is served from the `/crop-ledger/`
subpath, which `vite.config.ts` and the router basename both depend on.

## A note on your data

Everything is stored in your browser's IndexedDB, on the device you use. It is
not synced or backed up anywhere automatically. Clearing site data, or losing
the device, loses the ledger — so export a backup from **Backup & restore**
periodically and keep the file somewhere safe.
