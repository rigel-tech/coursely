# Authentication

ClickUp accepts two credential types. They are not interchangeable, and they use
**different header formats** — the most frequent cause of a 401 against this API.

## Personal token

A static API key tied to one user account. Not OAuth, despite looking like a token.

```
Authorization: pk_61634718_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

- Starts with `pk_`.
- Sent **raw, with no `Bearer` prefix**. Almost every other API wants `Bearer`; this one
  breaks if you add it.
- Never expires. It stays valid until a human revokes it in the UI.
- Carries the full permissions of the account that created it, across every Workspace
  that account belongs to. There is no scoping mechanism for personal tokens.

Get one from ClickUp: avatar (bottom left) → **Settings → Apps → API Token → Generate**.

Use it for scripts, one-off migrations, and local automation. Do not ship it in an
application that serves other users — that is what OAuth is for.

## OAuth

For applications acting on behalf of many users, each authorising their own Workspace.

```
Authorization: Bearer <access_token>
```

- Standard authorization-code flow: redirect the user, receive a `code`, exchange it for
  an access token.
- The redirect URI must be registered on the client application, and must match exactly.
- Access tokens currently do not expire, but the docs flag that this may change — do not
  build on the assumption that they are permanent.

## Handling tokens safely

A ClickUp token is equivalent to the account password for API purposes. Treat it as a
secret with no blast-radius limit.

Read it at call time from an ignored file; never interpolate it into anything that gets
printed, logged, or committed:

```bash
KEY=$(grep '^CLICKUP_API_KEY=' .env | cut -d= -f2- | tr -d '"'\''\r')
curl -s -H "Authorization: $KEY" "https://api.clickup.com/api/v2/team"
```

Before writing a token anywhere, confirm the destination is ignored — and confirm it by
asking git, not by reading `.gitignore`, because a pattern like `.env` matches at every
depth and it is easy to get this backwards in either direction:

```bash
git check-ignore -q path/to/.env && echo ignored || echo "NOT IGNORED"
git ls-files --error-unmatch path/to/.env 2>/dev/null && echo "ALREADY TRACKED"
```

Two failure modes worth naming, because neither announces itself:

- **A token printed into a transcript or CI log is disclosed.** File contents read by
  tooling end up in logs that outlive the task. If a token is ever echoed, rotate it —
  revoking and regenerating takes seconds, and a never-expiring credential in a log is
  permanent otherwise.
- **A token committed once stays in history** even after the file is deleted in a later
  commit. Rotation is the fix; removing the file is not.

Revoke at **Settings → Apps**, the same screen that issued it.

## Errors

| Error code                                                     | Meaning                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| `OAUTH_017`                                                    | No `Authorization` header on the request                     |
| `OAUTH_019`, `OAUTH_021`, `OAUTH_025`, `OAUTH_077`             | Token not found — usually revoked by the user                |
| `OAUTH_023`, `OAUTH_026`, `OAUTH_027`, `OAUTH_029`–`OAUTH_045` | Workspace not authorised for this token                      |
| `OAUTH_007`                                                    | Redirect URI does not match the registered one               |
| `OAUTH_010`                                                    | Client application was not created correctly                 |
| `OAUTH_171`                                                    | A webhook already exists for this configuration and location |

An HTTP `429` is not an auth failure — see [MCP-VS-REST.md](MCP-VS-REST.md#rate-limits).

## Browser calls are blocked

Requests straight from a browser fail CORS. ClickUp expects server-side callers; put a
proxy in front if a frontend needs the data.
