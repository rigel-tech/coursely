# Hierarchy

Everything in ClickUp hangs off one containment tree. Endpoints are addressed by the ID
of the level they act on, so locating the right ID is usually the first half of any task.

```
Workspace              (top level; contains users, Spaces, tags)
└── Space              (tags live here, not on the List)
    ├── Folder         (optional layer)
    │   └── List       (tasks live here)
    │       └── Task
    │           └── Subtask   (a Task with `parent` set)
    └── List           (folderless — a List directly under a Space)
```

## Folderless lists

A List does not need a Folder. Lists sitting directly under a Space are addressed by
their own endpoints, and code that assumes every List has a parent Folder will miss them:

| Goal                          | Endpoint                           |
| ----------------------------- | ---------------------------------- |
| Lists inside a Folder         | `GET /v2/folder/{folder_id}/list`  |
| Lists directly under a Space  | `GET /v2/space/{space_id}/list`    |
| Create inside a Folder        | `POST /v2/folder/{folder_id}/list` |
| Create directly under a Space | `POST /v2/space/{space_id}/list`   |

Walking a Workspace means doing both at every Space.

## v2 vs v3 terminology

The API is mid-migration, and the two versions use different words for the same thing.

| Concept       | v2 calls it | v3 calls it | Note                                        |
| ------------- | ----------- | ----------- | ------------------------------------------- |
| Top container | `team`      | `workspace` | **Same ID value** — only the name differs   |
| Folder        | `folder`    | `folder`    | `project` is the legacy term, still in docs |

So `/v2/team/{team_id}/task` and `/v3/workspaces/{workspace_id}/docs` take the same
number in that slot. The rename is cosmetic; do not go looking for a separate ID.

Path shapes differ too — v3 pluralises (`/v3/workspaces/...`) where v2 does not
(`/v2/team/...`). Most endpoints are still v2, but v3 is **not** limited to Docs: Move
Task is v3 while every other task endpoint is v2, so check `llms.txt` rather than
inferring the version from the subject.

## Finding IDs

**From a ClickUp URL.** The Workspace ID is the first number after the domain, and a
List view URL carries the List ID:

```
https://app.clickup.com/90182968612/v/l/li/901820541353
                       └ workspace ┘         └── list ──┘
https://app.clickup.com/t/86eyrzbtp
                          └ task id ┘
```

**By walking down.** Each level lists its children:

```bash
GET /v2/team                            # Workspaces the token can see
GET /v2/team/{team_id}/space            # Spaces
GET /v2/space/{space_id}/folder         # Folders
GET /v2/space/{space_id}/list           # folderless Lists
GET /v2/folder/{folder_id}/list         # Lists in a Folder
GET /v2/list/{list_id}/task             # Tasks
```

**Shared hierarchy.** Items shared with the user but living outside their own tree do
not appear in the walk above. `GET /v2/team/{team_id}/shared` returns those separately.

## Finding a user ID

`assignees` takes numeric user IDs, never names or emails ([TASKS.md](TASKS.md)). There is
no lookup-by-name endpoint — the IDs arrive as a side effect of the first call in the walk:

```bash
GET /v2/team          # each team carries a `members[]` array
                      # members[].user → { id, username, email }
```

So resolving "assign it to <person>" means reading `members[]` off the workspace and
matching on `username` or `email` yourself. Match on email when you have it; `username`
is a display name, it is free text, and it comes back `null` for a member who was invited
but has not yet set one up.

## Statuses belong to the List

A List's valid status values come from the List (which may inherit them from its Folder
or Space). There is no global status vocabulary, so a status string valid in one List
can be rejected in another. Read them before writing:

```bash
GET /v2/list/{list_id}          # returns the configured `statuses` array
```

## Writing a List description

A List carries a description — the natural home for a Sprint Goal or a Product Goal:

```bash
PUT /v2/list/{list_id}    # body: {"name": "...", "markdown_content": "## Goal\n\n..."}
```

Two things to get right:

- **`name` is required**, even when the description is all you are changing. Send the
  List's current name back verbatim — reconstructing it from memory renames the List, and
  nothing warns you.
- Write `markdown_content`; `content` stores the body as plain text. Same split as a task
  description, and the read side is worse — see below.

**Reads do not return the markdown.** `GET /v2/list/{list_id}` answers with `content`
holding the _rendered_ text: headings, bold and backticks are gone, not escaped. There is
no `markdown_content` on the response and no query parameter that brings it back, so the
source you wrote is not recoverable through the API. Keep it in the repo if it matters.
See [GOTCHAS.md](GOTCHAS.md#a-list-description-cannot-be-read-back-as-markdown).

## Tags belong to the Space

Tags are defined per Space, not per List or Task:

```bash
GET  /v2/space/{space_id}/tag           # list
POST /v2/space/{space_id}/tag           # create
POST /v2/task/{task_id}/tag/{tag_name}  # attach to a task
```

Observed behaviour: creating a task with a `tags` array containing names that do not yet
exist in the Space **creates them automatically**, with an assigned colour. Some tooling
documents the opposite ("tags must already exist"); the create-task path did not enforce
that. Verify by reading the task back if the distinction matters.

## Custom task IDs

Endpoints that take a `task_id` also accept a human-readable custom ID (`DEV-1234`) when
the Workspace has them enabled. Doing so requires two extra query parameters:

```
?custom_task_ids=true&team_id={workspace_id}
```

Without `team_id`, the custom ID is not resolved and the request 404s.
