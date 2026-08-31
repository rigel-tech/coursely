# Tasks

Tasks live in a List. Every write is addressed either by List (`create`) or by task ID
(everything else).

## Create a task

```
POST /v2/list/{list_id}/task
```

Only `name` is required. The parameters worth knowing:

| Parameter                          | Type            | Notes                                              |
| ---------------------------------- | --------------- | -------------------------------------------------- |
| `name`                             | string          | Required                                           |
| `description`                      | string          | Plain text                                         |
| `markdown_content`                 | string          | Markdown; wins over `description` if both are sent |
| `assignees`                        | array of int    | User IDs, not emails                               |
| `tags`                             | array of string | Tag **names**; Space-scoped                        |
| `status`                           | string          | Must be a status configured on that List           |
| `priority`                         | integer or null | `1`–`4`, see below                                 |
| `due_date`, `start_date`           | integer         | Unix **milliseconds**                              |
| `due_date_time`, `start_date_time` | boolean         | Whether the date carries a time component          |
| `time_estimate`                    | integer         | **Milliseconds** in the REST API                   |
| `points`                           | number          | Sprint points                                      |
| `parent`                           | string or null  | Parent task ID — this is how a subtask is created  |
| `custom_fields`                    | array           | `{ id, value }` objects                            |
| `custom_item_id`                   | number          | Custom task type; `0` is a standard task           |
| `check_required_custom_fields`     | boolean         | Enforce required fields before saving              |
| `notify_all`                       | boolean         | Notify watchers                                    |

## Priority

An integer, never a word. There are exactly four levels and they cannot be customised:

| Value | Meaning |
| ----- | ------- |
| `1`   | Urgent  |
| `2`   | High    |
| `3`   | Normal  |
| `4`   | Low     |

`null` clears the priority. Sending `"high"` is rejected.

Note that ClickUp's MCP tools take the _word_ (`"high"`) while REST takes the _number_
(`2`). Translating between the two is a common source of silently wrong priorities when
a script is ported from one to the other.

## Dates

All timestamps are Unix milliseconds, and the API always returns UTC.

A start or due date set **without** a time defaults to 4:00 am in the local timezone of
the user who set it. If that user later changes timezone, existing dates are not
recalculated — so date-only values drift relative to anyone else's clock. Read a date
back before doing arithmetic that assumes midnight.

## Descriptions

**The field is named differently for writing and for reading.**

| Direction | Field                  | How                                                        |
| --------- | ---------------------- | ---------------------------------------------------------- |
| Write     | `markdown_content`     | In the body of create and update. Wins over `description`. |
| Read      | `markdown_description` | Only returned with `?include_markdown_description=true`    |

Sending `markdown_description` on a write is not the documented request property — the
schema for both `POST .../task` and `PUT /v2/task/{id}` names `markdown_content`. Some
examples in ClickUp's own docs use the read name in a request body, and ClickUp's MCP
tools take `markdown_description` as their parameter, which is where the confusion starts.
When in doubt, write `markdown_content` and read back with the query parameter.

Supported markdown: headers, emphasis, ordered and unordered lists, links and images,
blockquotes, inline code.

Tables and checkboxes are **not** in that supported list, though they are accepted on
input. If a description must render as a table, verify it by reading the task back.

Double quotes inside `description`, `text_content`, or the markdown fields have to be
escaped as `\"`:

```json
{ "description": "Here is some text. \"This is speech.\" Additional text." }
```

Empty list items corrupt on write — see [GOTCHAS.md](GOTCHAS.md#empty-list-items-corrupt-silently).

## Reading tasks

```
GET /v2/task/{task_id}                  # one task
GET /v2/list/{list_id}/task             # tasks in a List — 100 per page
GET /v2/team/{team_id}/task             # filtered across the whole Workspace
```

Two behaviours that bite:

- **Pagination is 100 tasks per page** and there is no total count. Keep requesting
  successive `page` values until a short page comes back.
- `GET /v2/list/{list_id}/task` returns only tasks whose **home** List is that list.
  A task added to the List but living elsewhere is omitted unless `include_timl=true`
  is passed. A list that looks under-populated is usually this, not a filter bug.

`time_spent` is in milliseconds and appears only on tasks that have time entries.

A 404 from `GET /v2/task/{task_id}` says which kind of miss it was. `ITEM_013 Task not
found, deleted` means the ID did address a task and that task is gone; `SHARD_006 Not
found` means the ID never addressed a task at all — most often a Workspace, Space or List
ID pasted into the task endpoint.

## Update a task

```
PUT /v2/task/{task_id}
```

Accepts the same shape as create, minus `list_id`. **It does not update custom fields** —
values sent there are ignored without an error. See
[CUSTOM-FIELDS.md](CUSTOM-FIELDS.md#update-task-does-not-touch-custom-fields).

It also does not move the task. Changing `list_id` here is silently ignored; use the move
endpoint below.

## Move a task to another List

This one is **v3**, unlike every other task endpoint:

```
PUT /v3/workspaces/{workspace_id}/tasks/{task_id}/home_list/{list_id}
```

The body is required but may be empty — `-d '{}'` is a complete request. It changes the
task's **home** List only, and leaves any additional Lists (Tasks in Multiple Lists)
untouched.

```bash
curl -s -X PUT \
  "https://api.clickup.com/api/v3/workspaces/${WS}/tasks/${TASK}/home_list/${LIST}" \
  -H "Authorization: $KEY" -H "Content-Type: application/json" -d '{}'
```

A `200` answers `{"data":{"task_id":"...","new_list_id":"..."}}`. Points, priority, tags,
assignees, and custom field values all survive the move.

Two body parameters exist, and both are traps more often than tools:

| Parameter                                      | When you actually need it                                                                                                                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status_mappings`                              | Only when the task's current status name has **no counterpart** in the destination. Supplying it otherwise returns `400 Invalid status mappings` — see [GOTCHAS.md](GOTCHAS.md#status_mappings-is-rejected-when-it-is-not-needed).           |
| `move_custom_fields` / `custom_fields_to_move` | Only when a field's **definition** does not reach the destination List. A field held at Folder or Space level is already there; check with `GET /v2/list/{list_id}/field` first, and skip both parameters when the field is already visible. |

Statuses are matched by **name**, not ID. A destination with `override_statuses: true`
carries its own status IDs (`sc{list_id}_...` rather than `p{space_id}_...`), and the move
re-points the task at the destination's ID for the same name on its own.

There is no batch form — one request per task, inside the 100/minute budget.

## Dependencies

A directional "this blocks that" relationship, which ClickUp enforces in the UI.

```
POST /v2/task/{task_id}/dependency
```

The body carries exactly one of two keys — sending both is rejected:

| Key             | Meaning                                              |
| --------------- | ---------------------------------------------------- |
| `depends_on`    | `task_id` cannot start until this other task is done |
| `dependency_of` | `task_id` is blocking this other task                |

```bash
# US-102 is waiting on US-101
curl -s -X POST "https://api.clickup.com/api/v2/task/${US102}/dependency" \
  -H "Authorization: $KEY" -H "Content-Type: application/json" \
  -d "{\"depends_on\":\"${US101}\"}"
```

One request per relationship. A task with three blockers needs three calls — budget for
that against the rate limit when importing a dependency graph.

`GET /v2/task/{task_id}` returns them under `dependencies`:

```json
"dependencies": [
  { "task_id": "8xdfm9vmz", "depends_on": "8xdfe67cz", "type": 1,
    "date_created": "1744930371817", "userid": "395492",
    "workspace_id": "333", "chain_id": null }
]
```

Remove with `DELETE /v2/task/{task_id}/dependency`.

## Linked tasks

A plain association with no blocking semantics — use this when tasks are _related_ but
neither gates the other.

```
POST   /v2/task/{task_id}/link/{links_to}
DELETE /v2/task/{task_id}/link/{links_to}
```

Returned under `linked_tasks` on the task, separate from `dependencies`.

## Merging tasks

```
POST /v2/task/{task_id}/merge      # body: {"source_task_ids": ["abc123", "def456"]}
```

The task named in the path is the **survivor**; every ID in `source_task_ids` is folded
into it and then hard-deleted. Custom Task IDs are rejected here — native IDs only.

Comments and attachments move across. The **description does not**: the target keeps its
own body and the sources' bodies die with them. Write the combined description onto the
target first, then merge. See
[GOTCHAS.md](GOTCHAS.md#merging-discards-every-source-description).

## Large lists

A List holding many tasks and subtasks can produce a response big enough to time out.
The docs acknowledge this as a v2 limitation being addressed in v3. Filter or paginate
rather than fetching everything.
