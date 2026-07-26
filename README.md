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
  owes it**, tracked independently. That covers both the ordinary case (one
  person pays, several share it) and the case where one person pays but
  somebody else owes the whole amount. Splits can be equal or custom amounts.
- **Summary** — total spent, per-head share, what each person paid versus
  their share, spend by category, and the shortest list of payments that
  settles everyone up.
- **Backup** — export everything to a JSON file and restore it on another
  device.

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
