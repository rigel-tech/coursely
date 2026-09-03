// Seeds or removes the user the admin e2e specs log in with.
//
// This is a separate process, launched through `payload run`, because that is Payload's
// own CLI and it loads the config the way Next does. Importing the config directly from
// the Playwright process cannot work: `next` publishes no `exports` map, so the
// `next/cache` import inside the collection hooks resolves only under a bundler.
//
// Usage: payload run scripts/seed-e2e-user.ts <seed|cleanup> <email> <password>

import { getPayload } from 'payload'

import config from '../src/payload.config.js'

const [command, email, password] = process.argv.slice(2)

if (command !== 'seed' && command !== 'cleanup') {
  console.error(`seed-e2e-user: expected "seed" or "cleanup", got "${command}"`)
  process.exit(1)
}

if (!email || (command === 'seed' && !password)) {
  console.error('seed-e2e-user: email and password are required')
  process.exit(1)
}

// Top-level await, not a fire-and-forget promise: `payload run` awaits the dynamic import
// of this file and nothing else. A `.then()` chain resolves the import immediately and the
// process ends mid-flight — the script appears to succeed and creates nothing.
try {
  const payload = await getPayload({ config })

  // Delete first: seeding has to be repeatable against a database that already ran.
  await payload.delete({ collection: 'users', where: { email: { equals: email } } })

  if (command === 'seed') {
    await payload.create({
      collection: 'users',
      data: { email, password, role: 'ADMIN', status: 'ACTIVE' },
    })
  }
} catch (error) {
  console.error(error)
  process.exit(1)
}

// Payload holds the connection pool open, so the process will not exit on its own.
process.exit(0)
