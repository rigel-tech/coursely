# MCP vs REST

ClickUp offers the same data through two interfaces. They differ by a factor of roughly
1,400 in daily throughput, so the choice is not a matter of taste.

## Rate limits

**REST API** — per token, per **minute**:

| Plan                              | Requests / minute |
| --------------------------------- | ----------------- |
| Free Forever, Unlimited, Business | 100               |
| Business Plus                     | 1,000             |
| Enterprise                        | 10,000            |

Exceeding it returns `429`, with headers giving the current limit, remaining requests,
and reset time.

**MCP server** — **100 calls per day**, regardless of plan. The error is explicit:

```
⚡ Daily MCP limit reached (100/100 calls used).
Try again in 5h 10m.
```

carrying `errorCode: RATE_LIMIT_EXCEEDED` and a `retryAfter` in seconds.

Even the free REST tier allows 100 requests every _minute_ — 144,000 a day against MCP's 100. The MCP quota is a product limit on ClickUp's MCP offering, not an API constraint.

## Choosing

| Use MCP when                                    | Use REST when                 |
| ----------------------------------------------- | ----------------------------- |
| Exploring — a handful of reads                  | Any bulk operation            |
| Names are easier than IDs (tools resolve names) | You already hold the IDs      |
| No credential is set up yet                     | A personal token is available |
| One-off interactive work                        | Scripted or repeatable work   |

A useful rule: **anything that scales with the number of records goes over REST.**
Importing 26 tasks with 28 dependencies is 54 calls before a single read — over half the
daily MCP budget for one import.

## When MCP runs out

Nothing is lost; the two interfaces write to the same data. Switch front doors:

1. Get a personal token — [AUTHENTICATION.md](AUTHENTICATION.md#personal-token).
2. Translate the tool call to its endpoint. The mapping is mechanical, but the parameter
   names and value types are **not** identical (see below).
3. Re-run only the operations that did not complete. Record what succeeded _as it
   succeeds_, so the resume point is known without re-reading everything.

## Parameter differences between the two

The MCP tools are a wrapper, not a passthrough. Ported code breaks quietly on these:

| Concept          | MCP tool                                            | REST API                                                                                                             |
| ---------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Priority         | `"high"` (word)                                     | `2` (integer 1–4)                                                                                                    |
| Task description | `markdown_description` for both reading and writing | `markdown_content` to write; `markdown_description` only on read, and only with `?include_markdown_description=true` |
| Time estimate    | minutes                                             | **milliseconds**                                                                                                     |
| Dates            | `YYYY-MM-DD` string                                 | Unix milliseconds integer                                                                                            |
| Doc page update  | `clickup_update_document_page`                      | `PUT .../pages/{page_id}`                                                                                            |
| Workspace        | `workspace_id`                                      | `team_id` on v2 paths, same value                                                                                    |

Priority and time estimate are the dangerous pair: both accept the other form's value
shape without erroring in at least one direction, producing a task that looks created but
is wrong.

## Health checks do not prove a live connection

`claude mcp list` spawns its own process to test each server. It reporting `✔ Connected`
says the credentials work and the endpoint is reachable — it says **nothing** about the
current session's connection, which can be dead while the check passes.

Only a real tool call proves the session's link. See
[GOTCHAS.md](GOTCHAS.md#mcp-connection-drops).
