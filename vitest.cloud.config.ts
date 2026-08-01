import { defineConfig } from 'vitest/config'

/**
 * The suite that runs against a real Firestore emulator, exercising
 * `cloudRepository` and `firestore.rules` rather than a stand-in for them.
 * Run it with `npm run test:cloud`, which starts the emulator around it; CI
 * runs the same script in its own job.
 *
 * Separate from vitest.config.ts because that one has to stay runnable with
 * no setup at all, and this one needs a JDK and an emulator download.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.emu.test.ts'],
  },
})
