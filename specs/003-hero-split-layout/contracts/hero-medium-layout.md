# Rendering contract: `MediumImpactHero`

The component's props are unchanged — it still takes `Page['hero']` (`type`, `richText`, `links`, `media`, and `media.caption`). This contract covers only the markup it produces.

## Inputs (derived)

| Derived flag | Definition                                          |
| ------------ | --------------------------------------------------- |
| `hasText`    | `Boolean(richText)` OR `links` is a non-empty array |
| `hasMedia`   | `media` is a non-null object                        |

## Output structure

```
<div class="container my-8 grid gap-8  [md:grid-cols-2 md:items-center  — only when hasText && hasMedia]">
  {hasText   && <div data-region="text">  <RichText/> ?  <ul>…<CMSLink/>…</ul> ? </div>}
  {hasMedia  && <div data-region="media"> <Media/>    <RichText caption/> ?      </div>}
</div>
```

- `data-region` attributes are for test targeting; keep them on the two cells.
- Source order is always **text cell, then media cell**. This is the mobile stacking order and the DOM order at every width.

## Guarantees

| ID  | Guarantee                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C-1 | At viewport `< md`: one column, text above image.                                                                                                                                                      |
| C-2 | At viewport `>= md` with both `hasText` and `hasMedia`: two columns of equal width, text left, image right, vertically centred relative to each other.                                                 |
| C-3 | If exactly one of `hasText` / `hasMedia` is true: the container is a single column and the present cell spans it; the absent cell is not in the DOM (no empty column, no gutter).                      |
| C-4 | No colour, background, border, or `dark:` class is introduced. Only layout utilities (`container`, `grid`, `grid-cols-*`, `gap-*`, `items-*`, `md:*`) and any pre-existing typography/spacing classes. |
| C-5 | `media.caption`, when present, renders inside the media cell, after the image.                                                                                                                         |
| C-6 | `HighImpactHero`, `LowImpactHero`, `RenderHero`, and `heros/config.ts` produce byte-identical output to before this change.                                                                            |
| C-7 | No horizontal overflow attributable to the hero at 320–1920px width (no negative-margin bleed inside a grid cell).                                                                                     |

## Non-goals

- No new hero `type`, no admin field, no prop, no data migration.
- No editor control for the column ratio.
- Home-route-specific behaviour — any page using a Medium Impact hero gets this layout.
