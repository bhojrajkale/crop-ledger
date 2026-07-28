import { defineConfig } from 'vitest/config'

/**
 * The opt-in suite that runs against a real Firestore emulator, exercising
 * `cloudRepository` and `firestore.rules` rather than a stand-in for them.
 * Run it with `npm run test:cloud`, which starts the emulator around it.
 *
 * Separate from vitest.config.ts because that one has to stay runnable with
 * no setup at all — including in CI, which has no emulator.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.emu.test.ts'],
  },
})
