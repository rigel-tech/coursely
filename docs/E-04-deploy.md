# E-04 — deploying the students split

Read this before deploying the branch that adds the `students` collection. One step here is
not code and nothing in CI will catch it.

## Order of operations

1. Deploy the build. `prodMigrations` runs `20260909_140000_split_students_from_users`
   automatically on boot.
2. **Flush the `session:*` keyspace in Redis.** See below — this is the step to not skip.
3. Sanity-check one migrated student with
   `pnpm payload run scripts/check-migrated-login.ts <email> <their password>`. It exits
   non-zero if the password no longer works, so it can gate the rollout.

## The Redis step

```
redis-cli --scan --pattern 'session:*' | xargs -r redis-cli DEL
redis-cli --scan --pattern 'refresh:*' | xargs -r redis-cli DEL
redis-cli --scan --pattern 'spent:*'   | xargs -r redis-cli DEL
```

Every session record predates the split and its `userId` was minted from the old shared
`users` sequence. After the migration those ids belong to `students`, and the two tables
now issue ids independently — so a stale record can point at a different account than the
one that created it. Leaving them in place is silent: nothing errors, `logout-all` just
revokes the wrong person's sessions.

Everyone signs in again once, which is expected — see change 3 below.

## Four behaviour changes to announce first

1. **Students can no longer sign in at `/admin/login`.** Payload refuses them
   (`Students.access.admin` is `() => false`); it is not a redirect.
2. **Staff can no longer sign in at `/dang-nhap`.** They are refused exactly like an unknown
   address. This used to "work" and led to a dead end.
3. **Every existing session is invalidated.** Staff and students both sign in once more.
4. **An email already belonging to a staff account can now register as a student.** Email is
   unique per collection, so the two are separate accounts. This was previously blocked.

## Removed in the same change

`audit-logs` is gone — collection, table, and rows. `LOGIN_SUCCESS`, `LOGOUT` and
`LOGOUT_ALL` are no longer recorded anywhere. Refresh-token reuse is still detected and
still revokes the whole session line, but now leaves only a `console.error` line
(`refresh token reuse detected`) in the runtime log — set up log alerting if that signal
matters.

## Rollback

`pnpm payload migrate:down` restores the previous schema and moves students back into
`users` with their credentials intact. Two caveats:

- **Revert the code and the migration together.** The migration deletes rows from `users`;
  reverting only the deploy leaves the application looking for a table that still exists but
  is no longer written to.
- **`audit_logs` comes back empty.** `down` recreates the table; the rows it had are gone.

Rolling back also invalidates every session again, so people sign in a third time.
