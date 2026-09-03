// Two setup traps that a fresh clone hits and nobody else does, so nothing in review or CI
// catches them drifting back:
//
//  - `.env.example` is copied verbatim on first run. If its DATABASE_URL does not carry the
//    credentials `docker-compose.yml` declares, the first `pnpm dev` dies on `password
//    authentication failed` — from an example file that looks perfectly reasonable.
//  - `.prettierignore` inherited a blanket `**/docs/**` from the template, which silently
//    exempts this repo's own docs from `pnpm format` and from the pre-commit prettier pass.
//
// docs/ONBOARDING.md is the checklist both of these feed.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PRETTIER_BIN = 'node_modules/prettier/bin/prettier.cjs'
const ONBOARDING_DOC = 'docs/ONBOARDING.md'

const COMPOSE_PATTERNS = {
  user: /^[ \t]*POSTGRES_USER:[ \t]*(\S+)/m,
  password: /^[ \t]*POSTGRES_PASSWORD:[ \t]*(\S+)/m,
  database: /^[ \t]*POSTGRES_DB:[ \t]*(\S+)/m,
}

const composeValue = (key: keyof typeof COMPOSE_PATTERNS): string => {
  const match = readFileSync('docker-compose.yml', 'utf8').match(COMPOSE_PATTERNS[key])
  if (!match) throw new Error(`postgres ${key} not found in docker-compose.yml`)
  let val = match[1]
  const fallbackMatch = val.match(/\$\{[^:]+:-(.+)\}/)
  if (fallbackMatch) {
    val = fallbackMatch[1]
  }
  return val
}

const exampleDatabaseUrl = (): URL => {
  const match = readFileSync('.env.example', 'utf8').match(/^DATABASE_URL=(\S+)/m)
  if (!match) throw new Error('DATABASE_URL not found in .env.example')
  return new URL(match[1])
}

describe('dev setup', () => {
  it('the example DATABASE_URL matches the credentials the compose file creates', () => {
    const url = exampleDatabaseUrl()

    expect({
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
    }).toEqual({
      user: composeValue('user'),
      password: composeValue('password'),
      database: composeValue('database'),
    })
  })

  it('prettier does not ignore the repo docs', () => {
    expect(existsSync(ONBOARDING_DOC)).toBe(true)

    const info = execFileSync('node', [PRETTIER_BIN, '--file-info', ONBOARDING_DOC], {
      encoding: 'utf8',
    })

    expect(JSON.parse(info).ignored).toBe(false)
  })
})
