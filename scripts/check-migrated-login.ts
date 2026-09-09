// Proves a student carried over by the E-04 migration can still sign in with the password
// they had before it ran — i.e. that `hash` and `salt` moved untouched.
//
// Point DATABASE_URL at the migrated database and pass the credentials:
//   DATABASE_URL=... pnpm payload run scripts/check-migrated-login.ts <email> <password>
//
// Exits non-zero if the login is refused, so it can gate a deploy.

import { getPayload } from 'payload'

import config from '../src/payload.config.js'

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('check-migrated-login: email and password are required')
  process.exit(1)
}

try {
  const payload = await getPayload({ config })
  const { user } = await payload.login({ collection: 'students', data: { email, password } })
  if (!user) throw new Error('login returned no user')

  console.log(`OK — ${email} signed in as students#${user.id} (status ${user.status})`)
} catch (error) {
  console.error(`FAILED — ${email} could not sign in after the migration`)
  console.error(error)
  process.exit(1)
}

process.exit(0)
