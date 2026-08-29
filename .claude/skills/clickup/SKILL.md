---
name: clickup
description: Use when working with ClickUp — reading or writing tasks, lists, spaces, Docs, custom fields, dependencies, comments, or webhooks, through either the REST API or ClickUp's MCP server. Use when debugging ClickUp auth failures, 429 rate limits, MCP quota exhaustion, or Doc content that renders wrong after a write.
---

# ClickUp API and MCP

ClickUp exposes the same data through two front doors with very different limits and
ergonomics: a **REST API** (100 requests/minute) and an **MCP server** (100 calls/day).
Picking the wrong one is the single most common way to stall mid-task —
see [MCP-VS-REST.md](reference/MCP-VS-REST.md).

## Quick Reference

| Task                                      | Solution                                               | Details                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authenticate a script                     | `Authorization: pk_...` — **no** `Bearer`              | [AUTHENTICATION.md#personal-token](reference/AUTHENTICATION.md#personal-token)                                                                                     |
| Authenticate an app                       | `Authorization: Bearer <token>`                        | [AUTHENTICATION.md#oauth](reference/AUTHENTICATION.md#oauth)                                                                                                       |
| Keep a token out of git                   | Read from `.env` at call time, never echo it           | [AUTHENTICATION.md#handling-tokens-safely](reference/AUTHENTICATION.md#handling-tokens-safely)                                                                     |
| Find a list/space/folder ID               | Walk the hierarchy, or read it from a ClickUp URL      | [HIERARCHY.md#finding-ids](reference/HIERARCHY.md#finding-ids)                                                                                                     |
| `team_id` vs `workspace_id`               | Same number; v2 says team, v3 says workspace           | [HIERARCHY.md#v2-vs-v3-terminology](reference/HIERARCHY.md#v2-vs-v3-terminology)                                                                                   |
| Create a task                             | `POST /v2/list/{list_id}/task`                         | [TASKS.md#create-a-task](reference/TASKS.md#create-a-task)                                                                                                         |
| Set priority                              | Integer `1`–`4`, not a string                          | [TASKS.md#priority](reference/TASKS.md#priority)                                                                                                                   |
| Set a due date                            | Unix **milliseconds**, UTC                             | [TASKS.md#dates](reference/TASKS.md#dates)                                                                                                                         |
| Rich task description                     | `markdown_description`                                 | [TASKS.md#descriptions](reference/TASKS.md#descriptions)                                                                                                           |
| Link tasks as blocking                    | `POST /v2/task/{task_id}/dependency`                   | [TASKS.md#dependencies](reference/TASKS.md#dependencies)                                                                                                           |
| Non-blocking association                  | Task link, not dependency                              | [TASKS.md#linked-tasks](reference/TASKS.md#linked-tasks)                                                                                                           |
| List tasks in a list                      | `GET /v2/list/{list_id}/task` — 100/page               | [TASKS.md#reading-tasks](reference/TASKS.md#reading-tasks)                                                                                                         |
| Search tasks workspace-wide               | `GET /v2/team/{team_id}/task`                          | [TASKS.md#reading-tasks](reference/TASKS.md#reading-tasks)                                                                                                         |
| Update a custom field                     | `POST /v2/task/{task_id}/field/{field_id}`             | [CUSTOM-FIELDS.md#setting-values](reference/CUSTOM-FIELDS.md#setting-values)                                                                                       |
| Custom field won't update                 | Update Task ignores them — use the field endpoint      | [CUSTOM-FIELDS.md#update-task-does-not-touch-custom-fields](reference/CUSTOM-FIELDS.md#update-task-does-not-touch-custom-fields)                                   |
| Create or delete a field                  | Not possible via API — UI only                         | [CUSTOM-FIELDS.md#the-api-cannot-create-edit-or-delete-a-field](reference/CUSTOM-FIELDS.md#the-api-cannot-create-edit-or-delete-a-field)                           |
| Field list comes back empty               | Not shared down to that container yet                  | [CUSTOM-FIELDS.md#a-field-only-appears-once-it-reaches-the-container](reference/CUSTOM-FIELDS.md#a-field-only-appears-once-it-reaches-the-container)               |
| Drop-down reads back as a number          | Writes take the UUID, reads return `orderindex`        | [CUSTOM-FIELDS.md#reading-a-drop-down-back-is-not-symmetric-with-writing-it](reference/CUSTOM-FIELDS.md#reading-a-drop-down-back-is-not-symmetric-with-writing-it) |
| `ITEM_247` on a task type                 | Plan quota on custom task types, not a rate limit      | [GOTCHAS.md#custom-task-types-are-capped-by-plan](reference/GOTCHAS.md#custom-task-types-are-capped-by-plan)                                                       |
| Field write returned 200, nothing changed | The task was deleted — `200` proves nothing            | [GOTCHAS.md#writing-a-custom-field-to-a-deleted-task-returns-200](reference/GOTCHAS.md#writing-a-custom-field-to-a-deleted-task-returns-200)                       |
| Create a Doc page                         | `POST /v3/.../docs/{doc_id}/pages`                     | [DOCS.md#create-a-page](reference/DOCS.md#create-a-page)                                                                                                           |
| Edit a Doc page                           | `PUT /v3/.../pages/{page_id}` + `content_edit_mode`    | [DOCS.md#edit-a-page](reference/DOCS.md#edit-a-page)                                                                                                               |
| Doc renders as literal `\##`              | Content was written as plain text, not markdown        | [GOTCHAS.md#escaped-markdown-in-docs](reference/GOTCHAS.md#escaped-markdown-in-docs)                                                                               |
| Doc shows `null.` or `1.1.1.`             | An empty list item — give every item text              | [GOTCHAS.md#empty-list-items-corrupt-silently](reference/GOTCHAS.md#empty-list-items-corrupt-silently)                                                             |
| Checklist missing from a Doc              | Not supported by the Docs API at all                   | [DOCS.md#what-survives-a-write](reference/DOCS.md#what-survives-a-write)                                                                                           |
| Hit `429`                                 | Back off; limit is per token, per minute               | [MCP-VS-REST.md#rate-limits](reference/MCP-VS-REST.md#rate-limits)                                                                                                 |
| MCP says daily limit reached              | Switch to REST — a separate, far higher budget         | [MCP-VS-REST.md#when-mcp-runs-out](reference/MCP-VS-REST.md#when-mcp-runs-out)                                                                                     |
| MCP "server not connected"                | Session-local drop; CLI health check does not prove it | [GOTCHAS.md#mcp-connection-drops](reference/GOTCHAS.md#mcp-connection-drops)                                                                                       |

## Base URLs and versions

```
https://api.clickup.com/api/v2/...     # everything except Docs
https://api.clickup.com/api/v3/...     # Docs and Pages only
```

Most of the API is v2. Docs moved to v3 and use a different path shape
(`/v3/workspaces/{workspace_id}/...`) and different vocabulary. Mixing the two up
produces a 404 with no hint about the version, so check the version before the path.

## Essential Patterns

### A minimal authenticated request

```bash
KEY=$(grep '^CLICKUP_API_KEY=' .env | cut -d= -f2- | tr -d '"'\''\r')

curl -s "https://api.clickup.com/api/v2/task/86eyrzbtp" \
  -H "Authorization: $KEY"
```

The personal token goes in raw. Adding `Bearer` — the reflex from almost every other
API — fails authentication. See [AUTHENTICATION.md](reference/AUTHENTICATION.md).

### Create a task with a markdown body

```bash
curl -s -X POST "https://api.clickup.com/api/v2/list/${LIST_ID}/task" \
  -H "Authorization: $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "US-101 · Course catalog page",
    "markdown_description": "## Acceptance Criteria\n\n- Draft courses stay hidden\n",
    "priority": 2,
    "tags": ["sprint-1", "story"]
  }'
```

`priority` is an integer (`2` = High), never the word `"high"`. Tags are given by name.
See [TASKS.md](reference/TASKS.md).

### Declare that one task blocks another

```bash
curl -s -X POST "https://api.clickup.com/api/v2/task/${BLOCKED}/dependency" \
  -H "Authorization: $KEY" -H "Content-Type: application/json" \
  -d "{\"depends_on\":\"${BLOCKER}\"}"
```

One relationship per request — `depends_on` and `dependency_of` are mutually exclusive.

### Write a Doc page as real markdown

```bash
curl -s -X PUT \
  "https://api.clickup.com/api/v3/workspaces/${WS}/docs/${DOC}/pages/${PAGE}" \
  -H "Authorization: $KEY" -H "Content-Type: application/json" \
  -d '{"content":"## Heading\n\ntext\n","content_format":"text/md"}'
```

Omitting `content_format` or sending the body as plain text stores the markdown
**escaped**, so the page renders `\## Heading` as visible text. This is the most
common ClickUp Docs defect — [GOTCHAS.md](reference/GOTCHAS.md).

## Verify writes by reading back

ClickUp accepts content its renderer then mangles, and returns `success: true` either
way. Empty list items become the literal string `null.`, consecutive empty numbered
items collapse into `1.1.1.`, and checklists are dropped entirely. None of this
surfaces as an error.

After any Doc or description write, read the object back and check the content before
calling the work done. [GOTCHAS.md](reference/GOTCHAS.md) lists every trap observed so far.

## Reference

| File                                             | Covers                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| [AUTHENTICATION.md](reference/AUTHENTICATION.md) | Personal token vs OAuth, header formats, token hygiene, revocation      |
| [HIERARCHY.md](reference/HIERARCHY.md)           | Workspace → Space → Folder → List → Task, folderless lists, finding IDs |
| [TASKS.md](reference/TASKS.md)                   | CRUD, priority, dates, tags, dependencies, links, filtering, pagination |
| [CUSTOM-FIELDS.md](reference/CUSTOM-FIELDS.md)   | Field types, value shapes per type, setting and filtering               |
| [DOCS.md](reference/DOCS.md)                     | v3 Docs API, page tree, edit modes, what formatting survives            |
| [MCP-VS-REST.md](reference/MCP-VS-REST.md)       | Choosing a front door, both rate limits, migrating off MCP mid-task     |
| [GOTCHAS.md](reference/GOTCHAS.md)               | Silently-breaking behaviour, each with how it was observed              |

## Sources

Written against the official docs, fetched as markdown by appending `.md` to any page
URL. The full index lives at <https://developer.clickup.com/llms.txt> — start there when
this skill does not cover something, rather than guessing an endpoint path.
