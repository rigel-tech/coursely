# Docs and Pages

The only part of ClickUp on **API v3**. Different base path, different vocabulary, and a
renderer noticeably less capable than the product's own editor.

```
https://api.clickup.com/api/v3/workspaces/{workspace_id}/docs/...
```

A Doc is a container. Content lives on **Pages**, which nest arbitrarily deep via
`parent_page_id`.

## Endpoints

| Goal                   | Endpoint                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| Search Docs            | `GET /v3/workspaces/{workspace_id}/docs`                          |
| Create a Doc           | `POST /v3/workspaces/{workspace_id}/docs`                         |
| Fetch a Doc            | `GET /v3/workspaces/{workspace_id}/docs/{doc_id}`                 |
| Page tree (names only) | `GET /v3/workspaces/{workspace_id}/docs/{doc_id}/pageListing`     |
| All pages with content | `GET /v3/workspaces/{workspace_id}/docs/{doc_id}/pages`           |
| One page               | `GET /v3/workspaces/{workspace_id}/docs/{doc_id}/pages/{page_id}` |
| Create a page          | `POST /v3/workspaces/{workspace_id}/docs/{doc_id}/pages`          |
| Edit a page            | `PUT /v3/workspaces/{workspace_id}/docs/{doc_id}/pages/{page_id}` |

Use `pageListing` to discover structure cheaply; it returns names and IDs without
dragging every page body across.

## Reading IDs out of a Doc URL

```
https://app.clickup.com/90182968612/docs/2kzn5t94-1298/2kzn5t94-538
                       └ workspace ┘      └── doc ───┘ └── page ──┘
```

The first ID after `/docs/` is always the Doc. A URL with only one ID gives you the Doc
but no page — list the pages to get those.

## Create a page

```
POST /v3/workspaces/{workspace_id}/docs/{doc_id}/pages
```

| Parameter        | Notes                                   |
| ---------------- | --------------------------------------- |
| `name`           | Page title                              |
| `content`        | Page body                               |
| `content_format` | `text/md` (default) or `text/plain`     |
| `parent_page_id` | Omit for a root page; set it to nest    |
| `sub_title`      | Optional subtitle shown beside the name |

## Edit a page

```
PUT /v3/workspaces/{workspace_id}/docs/{doc_id}/pages/{page_id}
```

`content_edit_mode` decides how `content` is applied:

| Mode      | Effect                                                            |
| --------- | ----------------------------------------------------------------- |
| `replace` | **Default.** Overwrites the whole page. Existing content is lost. |
| `append`  | Adds to the end, server-side                                      |
| `prepend` | Inserts before existing content, server-side                      |

`append` and `prepend` merge on the server, so they preserve the current page exactly
without a read-modify-write cycle — and without the race that cycle introduces.

Because `replace` is the default, a call that means to add a section but omits
`content_edit_mode` destroys the page. Pass the mode explicitly on every edit.

## Always send content_format

Write markdown with `content_format: "text/md"`. Content submitted down a plain-text path
is stored **backslash-escaped**, and the page then renders the escapes as visible text:

```
\## Heading
\- bullet
\*\*bold\*\*
```

The write succeeds, so nothing signals the problem until someone opens the page. Details
and recovery in [GOTCHAS.md](GOTCHAS.md#escaped-markdown-in-docs).

## What survives a write

The Docs API supports markedly less than the editor. Anything below marked _No_ is
dropped or flattened on import, silently.

| Element                         | Supported                        |
| ------------------------------- | -------------------------------- |
| Normal text                     | Yes                              |
| Heading 1–4                     | Yes                              |
| Bulleted list                   | Yes                              |
| Numbered list                   | Yes                              |
| Quote                           | Yes                              |
| Code block                      | Yes, but code formatting is lost |
| Attachment                      | Yes, but sizing is not retained  |
| **Checklist**                   | **No**                           |
| **Banner / callout**            | **No**                           |
| **Toggle list**                 | **No**                           |
| Text alignment                  | No                               |
| Embedded task                   | No                               |
| Embedded Doc                    | No                               |
| Embedded Whiteboard             | No                               |
| Org chart                       | No                               |
| YouTube, Vimeo, Loom            | No                               |
| Miro, Giphy                     | No                               |
| Google Drive/Docs/Sheets/Slides | No                               |

Two consequences worth planning around:

- **Checklists cannot be created through the API.** Markdown `- [ ]` may round-trip as
  literal text in the stored content, but it is not a real checklist widget. Do not build
  a template that depends on interactive checkboxes appearing in a Doc.
- **Callouts have no API representation.** Use a `>` blockquote where the design wanted a
  banner; it is the closest thing that survives.

## Normalisation on round-trip

ClickUp rewrites markdown it accepts. Reading back what you wrote will not be
byte-identical:

| Written     | Returned                           |
| ----------- | ---------------------------------- |
| `- item`    | `*   item`                         |
| `*italic*`  | `_italic_`                         |
| `file_name` | `file\_name` (underscores escaped) |

All three render correctly. Do not treat the difference as corruption, and do not write a
sync that diffs stored content against source text expecting an exact match.
