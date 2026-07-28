import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The `.emu.test.ts` suite talks to a real Firestore emulator on port
    // 8080. `npm run test` must stay runnable anywhere with no setup — and CI
    // has no emulator — so those tests are opt-in via `npm run test:cloud`,
    // which starts one around them.
    exclude: [...defaultExclude, '**/*.emu.test.ts'],
  },
})
