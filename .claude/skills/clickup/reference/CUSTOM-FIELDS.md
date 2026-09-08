# Custom Fields

Custom Fields are defined on a container (List, Folder, Space, or Workspace) and carry a
value per task. Reading a definition and writing a value use different endpoints.

## The API cannot create, edit, or delete a field

Across all 173 endpoints there are only four reads, one write, and one clear:

```
GET    /v2/list|folder|space|team/{id}/field    # read definitions
POST   /v2/task/{task_id}/field/{field_id}      # set a value
DELETE /v2/task/{task_id}/field/{field_id}      # clear a value
```

There is **no endpoint to create a field, change its options, or delete it** — that is UI
work. The same is true of custom task types: `GET /v2/team/{team_id}/custom_item` lists
them and nothing creates or removes them.

Plan for this when scripting a migration: the field has to exist before any of it runs.
Fail loudly if the lookup comes back empty rather than writing to a guessed ID.

## Writes stop dead once the plan's usage cap is reached

```json
{ "err": "Custom field usages exceeded for your plan", "ECODE": "FIELD_033" }
```

From then on every `POST /v2/task/{task_id}/field/{field_id}` is a `400`, even one setting
the value the task already holds. Reads are unaffected and `DELETE` still clears a value
without returning the quota, so the fields are frozen rather than merely full — a cleared
value cannot be put back. Details and the substitute in
[GOTCHAS.md](GOTCHAS.md#custom-field-writes-are-capped-by-plan).

## A field only appears once it reaches the container

A field created elsewhere in the Workspace is invisible to a List until it is moved or
shared into that List's hierarchy. All four read endpoints return `{"fields":[]}` for a
List that inherits nothing — which looks identical to "no fields exist anywhere".

Before concluding a field is missing, check the Space and Workspace levels too.

## Update Task does not touch custom fields

`PUT /v2/task/{task_id}` **ignores** custom field values. It does not error — it accepts
the request, returns success, and silently drops them.

To change a value, use the dedicated endpoint, one call per field:

```
POST /v2/task/{task_id}/field/{field_id}
```

The only exception is task creation: `POST /v2/list/{list_id}/task` does accept a
`custom_fields` array of `{ id, value }`.

## Finding field IDs

```
GET /v2/list/{list_id}/field         # fields usable on tasks in this List
GET /v2/folder/{folder_id}/field
GET /v2/space/{space_id}/field
GET /v2/team/{team_id}/field
```

Fields can be scoped to specific custom task types. A task response only includes the
fields applicable to its `custom_item_id`, and writes to non-applicable fields are
rejected or ignored — so a field missing from a task is not necessarily a bug.

## Field types

Use these strings in the `type` property:

| Type                 | What it holds                                 |
| -------------------- | --------------------------------------------- |
| `url`                | A website URL                                 |
| `drop_down`          | One option from a menu                        |
| `labels`             | A flexible multi-select, similar to tags      |
| `email`              | A formatted email address                     |
| `phone`              | Phone number with country and area code       |
| `date`               | A date, optionally with time                  |
| `short_text`         | Single line of plain text                     |
| `text`               | A paragraph of plain text                     |
| `checkbox`           | Boolean                                       |
| `number`             | Numeric value                                 |
| `currency`           | The **Money** field — an amount in a currency |
| `tasks`              | Linked tasks, without using Relationships     |
| `users`              | The **People** field — users and teams        |
| `emoji`              | The **Rating** field — an emoji scale         |
| `automatic_progress` | Progress bar computed by ClickUp              |
| `manual_progress`    | Progress bar set by hand                      |
| `location`           | A Google Maps address                         |

Voting field values come back in the custom field array but **cannot be set** via the API.

## Setting values

Every write is `{ "value": ... }`; the shape of `value` depends on the type.

```jsonc
// url / email / phone / text / short_text
{ "value": "https://clickup.com" }
{ "value": "lana@clickup.com" }
{ "value": "+1 123 456 7890" }
{ "value": "Some text" }

// drop_down — the option's UUID, not its label
{ "value": "option_1_id" }

// checkbox
{ "value": true }

// number / currency
{ "value": -28 }
{ "value": 80000 }

// emoji (rating) — integer within the configured scale
{ "value": 4 }
```

### Dates

Unix milliseconds. Without `"time": true` only the date is displayed:

```json
{ "value": 1565993299379, "value_options": { "time": true } }
```

Reading back a date field that shows no time in the UI returns the millisecond value of
**4:00 am in the authorised user's timezone** — not midnight, and not UTC midnight. Do
not treat that as the start of the day.

### Tasks, users, labels

These take add/remove sets rather than a whole-value replacement:

```json
{ "value": { "add": ["task_id_1"], "rem": ["task_id_2"] } }
```

### Manual progress

```json
{ "value": { "current": 50 } }
```

## Removing a value

```
DELETE /v2/task/{task_id}/field/{field_id}
```

Clearing is not the same as setting an empty string — for typed fields, send the delete.

## The type_config property

Each field definition carries a `type_config` describing its options: the choices for a
`drop_down` or `labels` field, the currency and precision for `currency`, the scale and
symbol for `emoji`, the start/end values for progress fields. Read it before writing a
`drop_down` value, since the write takes an option UUID that only appears there.

## Reading a drop-down back is not symmetric with writing it

**Write takes the option's UUID. Read returns the option's `orderindex`.**

```jsonc
// what you POST
{ "value": "7d123997-da17-4e10-8fd7-f1a265b31447" }

// what GET /v2/task/{id}?include=custom_fields returns for the same field
{ "id": "1e8d4078-…", "name": "Type", "type": "drop_down",
  "type_config": { "options": [ /* … */ ] },
  "value": 2 }
```

`2` is the index of that option in `type_config.options`, not an ID. To turn it back into
a label, index into the options array — and never assume the order is stable if someone
can reorder options in the UI.

A verification script that greps the response for the UUID it just wrote will report
success on **every** task, because `include=custom_fields` embeds the full option list on
each one. Match `"value":` inside the field's own object instead.

Parsing that out without a JSON tool is fiddly, because the options array is separated by
the same `},{"id":"` that separates fields. Cut to the field by name first, drop the
options array, then read the first `"value":`:

```bash
sed 's/.*"name":"Type"//; s/"options":\[[^]]*\]//' task.json \
  | grep -o '"value":[0-9]*' | head -1
```

## Writing to a deleted task returns 200

`POST /v2/task/{task_id}/field/{field_id}` against a task that has been deleted responds
`HTTP 200` and does nothing. `GET` on the same ID returns `ITEM_013 Task not found,
deleted`.

So a bulk field update can report a clean run while silently skipping every deleted task.
Probe with a `GET` before writing; do not treat `200` as proof the task exists.
