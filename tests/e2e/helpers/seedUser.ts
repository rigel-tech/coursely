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

const SCRIPT = 'scripts/seed-e2e-user.ts'

const run = (
  command: 'seed' | 'cleanup',
  user: { email: string; password: string },
  role?: 'STUDENT',
): void => {
  execFileSync(
    'pnpm',
    ['payload', 'run', SCRIPT, command, user.email, user.password, ...(role ? [role] : [])],
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

/** Creates the e2e student user (role STUDENT, ACTIVE), replacing any earlier one. */
export async function seedStudentUser(): Promise<void> {
  run('seed', testStudent, 'STUDENT')
}

/** Removes the e2e student user. */
export async function cleanupStudentUser(): Promise<void> {
  run('cleanup', testStudent)
}
