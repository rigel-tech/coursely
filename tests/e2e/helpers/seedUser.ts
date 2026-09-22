// Deliberately imports nothing from src/. Playwright drives the app over HTTP; the moment
// this file pulls in the Payload config, the `next/cache` import inside the collection
// hooks stops resolving and Playwright fails during discovery — `0 tests in 0 files`, with
// no failing test to point at. tests/unit/repo/e2e-isolation.spec.ts guards that.
//
// The seeding itself runs in a child process via `payload run`, Payload's own CLI, which
// loads the config the way Next does.

import { execFileSync } from 'node:child_process'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
}

/** The public-site student the logout spec signs in as. */
export const testStudent = {
  email: 'student-e2e@payloadcms.com',
  password: 'test',
}

/**
 * A second student, for the session spec alone. Playwright runs spec files in parallel
 * workers, and `seed` is a plain `payload.create` — two workers seeding one email race, and
 * the loser dies on `ValidationError: email` before its first test runs. One fixture per
 * spec is the only thing that makes that impossible.
 */
export const testSessionStudent = {
  email: 'student-session-e2e@payloadcms.com',
  password: 'test',
}

const SCRIPT = 'scripts/seed-e2e-user.ts'

const run = (
  command: 'seed' | 'cleanup',
  user: { email: string; password: string },
  collection?: 'students',
): void => {
  execFileSync(
    'pnpm',
    [
      'payload',
      'run',
      SCRIPT,
      command,
      user.email,
      user.password,
      ...(collection ? [collection] : []),
    ],
    // shell: true because `pnpm` is a .cmd shim on Windows and execFile will not find it.
    { shell: true, stdio: 'inherit' },
  )
}

/** Creates the e2e admin user, replacing any earlier one so reruns are repeatable. */
export async function seedTestUser(): Promise<void> {
  run('seed', testUser)
}

/** Removes the e2e admin user. */
export async function cleanupTestUser(): Promise<void> {
  run('cleanup', testUser)
}

/** Creates the e2e student user in `students` (ACTIVE), replacing any earlier one. */
export async function seedStudentUser(): Promise<void> {
  run('seed', testStudent, 'students')
}

/** Removes the e2e student user. */
export async function cleanupStudentUser(): Promise<void> {
  run('cleanup', testStudent)
}

/** Creates the session spec's own student in `students` (ACTIVE). */
export async function seedSessionStudent(): Promise<void> {
  run('seed', testSessionStudent, 'students')
}

/** Removes the session spec's own student. */
export async function cleanupSessionStudent(): Promise<void> {
  run('cleanup', testSessionStudent)
}
