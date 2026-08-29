# Custom Fields

Custom Fields are defined on a container (List, Folder, Space, or Workspace) and carry a
value per task. Reading a definition and writing a value use different endpoints.

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
