# Gotchas

Behaviour that breaks without raising an error. Each entry says how it was observed, so
the claim can be re-tested rather than trusted.

The unifying rule: **ClickUp returns `success: true` for content its renderer then
mangles.** A write result is not evidence the write is correct. Read it back.

## Empty list items corrupt silently

_Observed 2026-08-27 while writing Doc pages; confirmed by reading the pages back._

An empty markdown list item does not stay empty. It is serialised into visible garbage:

| Written                          | Stored and rendered as |
| -------------------------------- | ---------------------- |
| `-` alone on a line              | `null.`                |
| `1.` `2.` `3.` on separate lines | `1.1.1.`               |
| `- [ ]` with no label            | at risk of the same    |

The update call returns success. The corruption is only visible on the page.

**Fix:** give every list item text, even placeholder text. A template section meant to be
filled in later should be an empty section under a heading, not an empty bullet:

```markdown
## Out of scope

## Dependencies
```

not

```markdown
## Out of scope

-
```

## Escaped markdown in Docs

_Observed 2026-08-27 on a Doc whose pages rendered `\## Heading` as body text._

Content written down a plain-text path is stored with every markdown character
backslash-escaped:

```
\## 👤 User Story
\- Epic:
\*\*Scenario 1:\*\*
\- \[ \]
```

The page then displays those escapes literally: no headings, no bullets, no bold. The
whole document flattens into one block of text with backslashes through it.

**Diagnosis:** fetch the page and look at the raw `content`. Backslashes before `#`, `-`,
`*`, or `[` mean escaped content, not a rendering bug.

A useful tell: tables are unaffected, because a markdown table has no leading character
to escape. A Doc where the tables look right and everything else looks broken is almost
always this.

**Fix:** rewrite the page with `content_format: "text/md"`. There is no in-place unescape.

## Tables round-trip differently than written

_Observed across every Doc write in the same session._

ClickUp normalises accepted markdown. Expect `- item` to come back as `*   item`,
`*italic*` as `_italic_`, and `file_name` as `file\_name`. All render correctly.

Do not build a sync that compares stored content to source text for equality — it will
report a diff on every run.

## Update Task ignores custom fields

_Documented behaviour._

`PUT /v2/task/{task_id}` accepts custom field values and drops them, returning success.
Use `POST /v2/task/{task_id}/field/{field_id}`, one call per field. See
[CUSTOM-FIELDS.md](CUSTOM-FIELDS.md).

## Writing a custom field to a deleted task returns 200

_Observed 2026-08-29 while backfilling a drop-down across a backlog._

`POST /v2/task/{task_id}/field/{field_id}` on a deleted task answers `HTTP 200` with no
body of substance, and changes nothing. `GET /v2/task/{task_id}` on that same ID returns
`ITEM_013 Task not found, deleted`.

A loop that only checks the status code therefore reports a clean run over tasks that no
longer exist. `GET` first; the status code is not evidence of existence.

## Merging discards every source description

_Observed 2026-08-29 while folding two backlog stories into one._

`POST /v2/task/{target}/merge` answers `HTTP 200` with an empty object `{}` — the same
answer whether or not anything of value survived. Comments and attachments move to the
target; the source tasks' **descriptions do not**, and the sources are hard-deleted, so
`GET` on them returns `ITEM_013 Task not found, deleted`.

Nothing in the response hints that content was dropped, and there is no undo. Write the
merged description onto the target, read it back, and only then merge.

## Drop-down reads return an index, not the ID you wrote

_Observed 2026-08-29, same session._

Writes take the option UUID. Reads return the option's `orderindex` integer. See
[CUSTOM-FIELDS.md](CUSTOM-FIELDS.md#reading-a-drop-down-back-is-not-symmetric-with-writing-it).

Two ways this bites a verification pass:

- Grepping the response for the UUID you wrote matches on **every** task, because
  `include=custom_fields` embeds the whole option list on each one. The check passes
  regardless of the stored value.
- Splitting the JSON on `},{"id":"` to isolate a field cuts the options array too, so the
  fragment holding `"name":"Type"` no longer holds that field's `"value"`, and every task
  reads as empty.

Both failure modes produce a confident, wrong answer — one all-pass, one all-empty.

## Custom task types are capped by plan

_Observed 2026-08-29: 19 tasks carried a custom type, the 20th write was rejected._

```json
{ "err": "Max usage for custom task types reached", "ECODE": "ITEM_247" }
```

`HTTP 400`, not `429` — this is a plan quota on how many tasks may carry a custom task
type, not a rate limit, so waiting does not help. The cap counts across the whole
Workspace, including Spaces unrelated to the work at hand.

Setting `custom_item_id` back to `0` releases a slot. A drop-down custom field carries
the same information without touching the quota, at the cost of the type not showing in
the task header.

## Lists hide tasks whose home is elsewhere

_Documented behaviour._

`GET /v2/list/{list_id}/task` returns only tasks whose **home** List is that list. A task
added to the List from elsewhere is missing until `include_timl=true` is passed. A
suspiciously short list is usually this, not a broken filter.

## Date-only values are 4 am, not midnight

_Documented behaviour._

A start or due date with no time component resolves to 4:00 am in the setting user's
local timezone — and date custom fields read back the same way. Timezone changes are not
applied retroactively, so the stored instant drifts from what the UI shows for other
users. Never assume a date-only field is midnight UTC.

## MCP connection drops

_Observed three times in one session, 2026-08-27._

The session's link to a remote MCP server can die mid-task. Every subsequent tool call
returns `MCP server "..." is not connected` — including reads that worked seconds before.

`claude mcp list` will still report `✔ Connected`, because it spawns a **separate
process** with its own connection. That check validates credentials and reachability, not
the session's socket. Do not use it to conclude the connection is fine.

Recovery is `/mcp` to reconnect, or waiting — the connection sometimes returns on its
own. Neither is something a script can do for itself.

**Consequence for long imports:** a bulk operation over MCP can stop at any point. Record
each success as it happens, so the resume point is known without re-reading the whole
target.

## Account switches break connector auth with a 404

_Observed 2026-08-27 after switching Claude Code accounts mid-session._

Switching accounts leaves the running process holding the old identity. The connector
proxy then rejects calls for a connector the _new_ account owns:

```json
{ "type": "not_found_error", "message": "Server not found" }
```

A `404` here, not a `401` — and the `request_id` belongs to the proxy, not ClickUp, which
is how to tell it apart from a genuine ClickUp error. `/mcp` reconnect fails the same way,
because it reuses the in-memory identity.

**Fix:** restart the session so credentials are re-read from disk. Nothing in-session
resolves it.

## Tags may auto-create

_Observed 2026-08-27 creating tasks with previously unseen tag names._

Tooling documents that `tags` must already exist in the Space. In practice, creating a
task with new tag names created them, with colours assigned. The behaviour may differ
between the create-task path and the attach-tag path.

Do not rely on either reading. If tag creation matters, create tags explicitly with
`POST /v2/space/{space_id}/tag` and verify.
