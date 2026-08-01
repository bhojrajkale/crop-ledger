import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The `.emu.test.ts` suite talks to a real Firestore emulator on port
    // 8080, which needs a JDK and a download. `npm run test` must stay
    // runnable anywhere with no setup at all, so those tests live behind
    // `npm run test:cloud`, which starts an emulator around them. CI runs it
    // as its own job.
    exclude: [...defaultExclude, '**/*.emu.test.ts'],
  },
})
