# Feature Specification: Access + Refresh Token Sessions

**Feature Branch**: `feat/redis-register-form` (spec dir: `001-access-refresh-sessions`)

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "Custom access + refresh token authentication with Redis-backed session management for the public/student app. Replace the single 2h Payload JWT with a short-lived access token plus a rotating opaque refresh token, add logout / logout-all, keep an audit trail, and make 'remember me' actually last."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Stay signed in past the access-token lifetime (Priority: P1)

A signed-in student keeps using the site for hours. Their short-lived access credential
expires while they are still active, but their session silently continues without a
re-login prompt, up to the lifetime their "remember me" choice granted at login.

**Why this priority**: This is the core defect today — "remember me" sets a 30-day cookie
but the underlying credential dies after 2 hours, so the promise is already broken. Nothing
else in the feature matters if renewal does not work.

**Independent Test**: Sign in, let the access credential pass its expiry, trigger a
protected request, and confirm the user is still authenticated and a _new_ access
credential was issued — with no visible interruption.

**Acceptance Scenarios**:

1. **Given** a signed-in session whose access credential is still valid, **When** the user
   loads a protected page, **Then** they see it with no renewal taking place.
2. **Given** a signed-in session whose access credential has expired but whose refresh
   credential is still valid, **When** the session is renewed, **Then** a new access
   credential and a new refresh credential are issued and the old refresh credential stops
   working.
3. **Given** a session whose refresh credential has also expired, **When** renewal is
   attempted, **Then** it fails and the user is treated as signed out.
4. **Given** a login **with** "remember me", **When** 20 days pass with periodic activity,
   **Then** the session is still renewable.
5. **Given** a login **without** "remember me", **When** the browser session ends, **Then**
   the session is no longer renewable on next launch.

---

### User Story 2 - Sign out from this device (Priority: P1)

A student on a shared computer clicks "Sign out". Their session on that device is ended
immediately and cannot be resurrected with any credential that browser still holds.

**Why this priority**: There is no logout at all today; a user cannot end their own
session. Required for any use on shared or public machines.

**Independent Test**: Sign in, sign out, then attempt to reuse the browser's held
credentials against a protected route and against the renewal path — both must fail.

**Acceptance Scenarios**:

1. **Given** a signed-in session, **When** the user signs out, **Then** both held
   credentials are cleared and the server-side session record is gone.
2. **Given** a session that has been signed out, **When** its former refresh credential is
   presented for renewal, **Then** renewal is refused.
3. **Given** a signed-out user, **When** they open a protected page, **Then** they are sent
   to the sign-in screen.

---

### User Story 3 - Sign out everywhere (Priority: P2)

A student suspects someone else has access to their account. They choose "Sign out of all
devices" and every session for their account — on every device — stops working.

**Why this priority**: A concrete account-safety action. Valuable but depends on the
session store from P1/P2 already existing.

**Independent Test**: Sign in from two independent clients, invoke "sign out everywhere"
from one, and confirm neither client can load a protected page or renew afterward.

**Acceptance Scenarios**:

1. **Given** a user with three active sessions, **When** they sign out everywhere, **Then**
   all three server-side session records are removed.
2. **Given** "sign out everywhere" has run, **When** any of those sessions' refresh
   credentials is presented, **Then** renewal is refused.
3. **Given** "sign out everywhere" was invoked from session A, **When** it completes,
   **Then** session A is also ended (no session survives).

---

### User Story 4 - Stolen refresh credential is detected and neutralised (Priority: P2)

An attacker copies a student's refresh credential. The legitimate browser renews first,
rotating that credential. When the stolen copy is later presented, the system recognises a
already-spent credential, treats it as theft, kills the whole session line, and records
the event.

**Why this priority**: Rotation without reuse-detection leaves a stolen long-lived
credential usable until it expires. Detection is what makes rotation worth doing.

**Independent Test**: Capture a refresh credential, renew once legitimately, then present
the captured (now stale) credential and confirm renewal is refused, the session is dead
for _both_ parties, and an audit record was written.

**Acceptance Scenarios**:

1. **Given** a refresh credential that has already been rotated once, **When** it is
   presented again, **Then** renewal is refused.
2. **Given** such a reuse has been detected, **When** the detection completes, **Then**
   every session in that session line is revoked.
3. **Given** a reuse detection, **When** it completes, **Then** an audit record of type
   "refresh token reuse" is written with the account, time, address, and user agent.

---

### User Story 5 - Audit trail for session lifecycle (Priority: P3)

An administrator reviewing account activity can see when each session was created and
ended, and can distinguish a normal sign-out from a forced revocation or a theft response.

**Why this priority**: Extends the existing `LOGIN_SUCCESS` audit trail. Useful for support
and incident review but not required for the auth flow to function.

**Independent Test**: Perform sign-in, sign-out, sign-out-everywhere, and a reuse
detection, then read the audit log and confirm one distinct, attributable record per event.

**Acceptance Scenarios**:

1. **Given** a successful sign-in, **When** it completes, **Then** a `LOGIN_SUCCESS` record
   exists (unchanged from today).
2. **Given** a sign-out, **When** it completes, **Then** a `LOGOUT` record exists.
3. **Given** a sign-out-everywhere, **When** it completes, **Then** a record identifying it
   as an all-session revocation exists.

---

### Edge Cases

- **Renewal race**: two protected requests arrive at once, both with the expired access
  credential and the same valid refresh credential. One rotation must win; the other must
  not be classified as theft. Assumption: a short grace window or single-flight on the
  refresh credential (resolved at plan time), not a reuse alarm.
- **Clock skew**: access credential shows as expired a few seconds early/late. Renewal path
  must still accept a refresh credential that is genuinely valid.
- **Refresh credential present, access credential absent** (e.g. access cookie cleared by
  the browser but refresh cookie kept): treated the same as an expired access credential —
  eligible for renewal.
- **Both credentials absent**: anonymous; protected routes redirect to sign-in, public
  routes render normally.
- **Account disabled while a session is live**: the next renewal must fail; behaviour
  between renewals depends on the middleware-revocation decision (see clarifications).
- **`PAYLOAD_SECRET` rotated**: all access credentials become invalid immediately; sessions
  whose refresh credential is still valid recover on next renewal.
- **Redis unavailable**: renewal, sign-out, and sign-out-everywhere cannot be served —
  define the user-facing outcome (fail closed: treat as signed out) at plan time. With
  inline renewal in the route guard (FR-023), a store outage means every expired-access
  request degrades to signed-out until the store recovers.
- **Admin area**: an administrator authenticated through the separate admin sign-in is
  unaffected by any of this; the student cookie (FR-022) and `payload-token` are distinct,
  so a signed-in admin and a signed-in student can coexist in one browser.
- **A session's idle lifetime vs its absolute lifetime**: with "remember me", is 30 days a
  hard ceiling from login, or a rolling 30-day window from last activity? Assumption:
  rolling window, capped by an absolute maximum (resolved at plan time).

## Requirements _(mandatory)_

### Functional Requirements

#### Tokens & renewal

- **FR-001**: On successful sign-in the system MUST issue two separate credentials: a
  short-lived access credential and a longer-lived refresh credential, each stored in the
  browser such that client-side scripts cannot read them.
- **FR-002**: The access credential MUST be verifiable by the route guard without any
  datastore lookup, and MUST carry the account id, role, and status.
- **FR-003**: The access credential's lifetime MUST be approximately 15 minutes.
- **FR-004**: The refresh credential MUST be a high-entropy opaque value; the server MUST
  store only a non-reversible hash of it, never the value itself.
- **FR-005**: The system MUST provide a renewal operation that, given a valid, unspent
  refresh credential, issues a new access credential and a new refresh credential and marks
  the presented refresh credential spent.
- **FR-006**: Renewal MUST be refused when the refresh credential is unknown, expired,
  already spent, or belongs to a revoked session.
- **FR-007**: The renewal operation MUST NOT itself redirect; it MUST report an outcome the
  caller acts on (consistent with the existing auth-action rule).
- **FR-008**: "Remember me" at sign-in MUST determine the refresh credential's lifetime:
  selected → about 30 days; not selected → limited to the browser session.
- **FR-009**: The email-OTP verification step, which also signs the user in, MUST issue the
  same two credentials by the same rules.

#### Sessions

- **FR-010**: The system MUST keep one server-side session record per sign-in, holding at
  least: session id, account id, the refresh-credential hash, the session line id,
  originating address, originating user agent, creation time, last-renewal time, and expiry
  time.
- **FR-011**: The system MUST maintain a per-account index of that account's active session
  ids.
- **FR-012**: Session records and their index entries MUST expire automatically once the
  refresh credential can no longer be valid.
- **FR-013**: Renewal MUST update the session's last-renewal time and stored
  refresh-credential hash in place, keeping the same session id and session line id.

#### Sign-out

- **FR-014**: A signed-in user MUST be able to end the current session; doing so removes
  the server-side record and clears both browser credentials.
- **FR-015**: A signed-in user MUST be able to end every session on their account in one
  action, including the one they invoke it from.
- **FR-016**: After any sign-out, a subsequent renewal attempt with a credential from an
  ended session MUST be refused.

#### Theft response

- **FR-017**: Presenting a refresh credential that is recognised but already spent MUST be
  treated as compromise: every session in that session line is revoked.
- **FR-018**: A reuse detection MUST write an audit record of a distinct type, attributed
  to the account, with time, address, and user agent.

#### Audit

- **FR-019**: Successful sign-in MUST continue to write a `LOGIN_SUCCESS` audit record
  (unchanged).
- **FR-020**: Single-session sign-out MUST write a `LOGOUT` audit record; all-session
  sign-out MUST write a record marked as an all-session revocation.

#### Route guard

- **FR-021**: The route guard MUST continue to gate the admin area, the student area, and
  the OTP step, and MUST keep forwarding the verified identity to server components via
  request headers that a client cannot forge.
- **FR-022**: The student access credential MUST use its own dedicated browser cookie,
  distinct from the `payload-token` cookie used by the separate admin/native sign-in. The
  route guard MUST read the admin cookie for the admin area and the student cookie
  elsewhere. Neither flow's sign-in, renewal, or sign-out may overwrite or invalidate the
  other's cookie. _(Q1 → A.)_
- **FR-023**: When the access credential is expired or absent but a valid, unspent refresh
  credential is held, the route guard itself MUST perform renewal inline — reading the
  session store only in that case — issue fresh access and refresh cookies on the response,
  and serve the request as authenticated, with no re-login screen shown. _(Q2 → B.)_
- **FR-024**: A session that has been revoked (single sign-out, all-session sign-out, or
  theft response) MUST stop granting access. Revocation takes effect immediately for the
  _refresh_ credential (next renewal fails); for an already-issued _access_ credential it
  takes effect no later than its ≤15-minute expiry, after which FR-023 renewal fails and
  the user is treated as signed out. _(Q2 → B; per-request revocation checking was option C
  and is not adopted.)_

### Key Entities _(include if feature involves data)_

- **Access credential**: Short-lived, self-describing proof of identity. Holds account id,
  role, status, and an expiry. Verified in isolation, no lookup. Not stored server-side.
- **Refresh credential**: Long-lived opaque secret held only by the browser. The server
  keeps just its hash, linked to exactly one session record, and marks it spent on
  rotation.
- **Session record**: One per sign-in. Links an account to its current refresh-credential
  hash and to a session line; carries origin metadata and timestamps; self-expires.
- **Session line (family)**: All session records descended from one sign-in through
  successive rotations. The unit that theft-response revokes.
- **Per-account session index**: The set of a given account's active session ids; the unit
  that "sign out everywhere" walks.
- **Audit record**: Existing entity. New event types: `LOGOUT`, all-session revocation, and
  refresh-credential reuse.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user who selected "remember me" and stays periodically active is never
  shown a re-login screen for at least 30 days.
- **SC-002**: Session renewal is invisible to the user — no full-page reload, no flash of a
  signed-out state, no interaction required — in 100% of renewals where the refresh
  credential is valid.
- **SC-003**: After "sign out", the same browser cannot reach any protected page or renew
  the session — 0 successful renewals in test.
- **SC-004**: After "sign out everywhere", every previously active session for the account
  fails to renew — 0 successful renewals across all of them.
- **SC-005**: A refresh credential replayed after one legitimate rotation never yields a
  new session, and each such attempt produces exactly one audit record.
- **SC-006**: The raw refresh credential value never appears in the datastore — verifiable
  by inspecting stored session records.
- **SC-007**: Every session lifecycle event (sign-in, renewal, sign-out, all-session
  sign-out, reuse detection) is attributable to an account and a time; sign-in / sign-out /
  reuse also carry origin address and user agent.
- **SC-008**: Introducing this feature does not regress administrator sign-in: an admin can
  still sign in and use the admin area with no change to their flow.

## Assumptions

- **Existing infrastructure is reused**: the datastore already used for one-time codes
  backs the session store; the existing audit-log collection gains new event types; the
  existing route guard is extended, not replaced.
- **Concurrent-session cap**: no hard limit on simultaneous sessions per account in this
  feature. If abuse appears, a cap is a later change. _(Was an open question; defaulted.)_
- **"My devices" management screen** (viewing and individually revoking sessions from a
  list) is **out of scope** here. This feature builds the session store and the
  everywhere-sign-out that such a screen would later sit on. _(Was an open question;
  defaulted.)_
- **Refresh-token lifetime with "remember me"** is a rolling window from last activity,
  bounded by an absolute maximum; exact numbers set at plan time.
- **Redis/datastore outage on the renewal, sign-out, or sign-out-everywhere path** fails
  closed: the user is treated as signed out rather than being granted access.
- **Renewal concurrency** is handled by single-flight or a brief grace window on a
  just-rotated credential, so a legitimate double-request is not mistaken for reuse.
- **Only the public/student app** is in scope. The admin area keeps its current
  authentication untouched.
- **No change to the sign-in credential check itself** (email + password, rate limits,
  lockout, status branching) — only what happens _after_ a successful check.

## Resolved Clarifications

- **Q1 — Access-credential cookie identity → Option A.** The student access credential gets
  its own dedicated cookie; `payload-token` stays reserved for the admin/native flow; the
  route guard branches per area. Reflected in FR-022. Consequence: the documented invariant
  around `AUTH_TOKEN_COOKIE` is rewritten in the same commit that ships this.
- **Q2 — Renewal location and revocation latency → Option B.** The route guard performs
  renewal inline when the access credential is expired/absent and a valid refresh
  credential is present, reading the session store only in that case. No per-request
  session check (option C was not adopted), so a revoked access credential remains usable
  until its ≤15-minute expiry. Reflected in FR-023 and FR-024.
