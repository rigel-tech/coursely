/**
 * The `--tw-prose-*` block below is the whole reason this file carries colour at all.
 *
 * `@tailwindcss/typography` defines 36 of these and fills them from its own slate/gray ramp.
 * Anything left unmapped keeps the vendor's grey, and `theme-guard` cannot see it — the
 * guard never opens node_modules. So every one of the 36 is mapped here, and
 * `tests/unit/repo/prose-tokens.spec.ts` fails if the plugin ever adds a 37th.
 *
 * A role and its `invert-` twin deliberately point at the SAME token. The tokens already
 * flip on `[data-theme='dark']`, so `dark:prose-invert` must not layer a second flip on top
 * — it would paint dark-mode rich text in light-mode colours.
 *
 * Written out one line per variable rather than generated in a loop: this file is read by
 * `theme-tokens.spec.ts` and `prose-tokens.spec.ts` as text, and a loop would leave them
 * matching nothing while still reporting green.
 *
 * @type {import('tailwindcss').Config}
 */
const config = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: [
            {
              '--tw-prose-body': 'var(--foreground)',
              '--tw-prose-headings': 'var(--heading-accent)',
              '--tw-prose-lead': 'var(--muted-foreground)',
              '--tw-prose-links': 'var(--link)',
              '--tw-prose-bold': 'var(--foreground)',
              '--tw-prose-counters': 'var(--muted-foreground)',
              '--tw-prose-bullets': 'var(--muted-foreground-subtle)',
              '--tw-prose-hr': 'var(--border)',
              '--tw-prose-quotes': 'var(--foreground)',
              '--tw-prose-quote-borders': 'var(--border)',
              '--tw-prose-captions': 'var(--muted-foreground)',
              '--tw-prose-kbd': 'var(--foreground)',
              // The colour of a 1px ring plus a 3px drop under <kbd>, not a shadow opacity.
              '--tw-prose-kbd-shadows': 'var(--border)',
              '--tw-prose-code': 'var(--heading-accent)',
              '--tw-prose-pre-code': 'var(--foreground)',
              // The plugin makes code blocks dark even in light mode. Ours follow the theme:
              // a tinted surface in light, a raised one in dark.
              '--tw-prose-pre-bg': 'var(--muted)',
              '--tw-prose-th-borders': 'var(--border)',
              '--tw-prose-td-borders': 'var(--border)',

              '--tw-prose-invert-body': 'var(--foreground)',
              '--tw-prose-invert-headings': 'var(--heading-accent)',
              '--tw-prose-invert-lead': 'var(--muted-foreground)',
              '--tw-prose-invert-links': 'var(--link)',
              '--tw-prose-invert-bold': 'var(--foreground)',
              '--tw-prose-invert-counters': 'var(--muted-foreground)',
              '--tw-prose-invert-bullets': 'var(--muted-foreground-subtle)',
              '--tw-prose-invert-hr': 'var(--border)',
              '--tw-prose-invert-quotes': 'var(--foreground)',
              '--tw-prose-invert-quote-borders': 'var(--border)',
              '--tw-prose-invert-captions': 'var(--muted-foreground)',
              '--tw-prose-invert-kbd': 'var(--foreground)',
              '--tw-prose-invert-kbd-shadows': 'var(--border)',
              '--tw-prose-invert-code': 'var(--heading-accent)',
              '--tw-prose-invert-pre-code': 'var(--foreground)',
              '--tw-prose-invert-pre-bg': 'var(--muted)',
              '--tw-prose-invert-th-borders': 'var(--border)',
              '--tw-prose-invert-td-borders': 'var(--border)',

              h1: {
                fontWeight: 'normal',
                marginBottom: '0.25em',
              },
            },
          ],
        },
        base: {
          css: [
            {
              h1: {
                fontSize: '2.5rem',
              },
              h2: {
                fontSize: '1.25rem',
                fontWeight: 600,
              },
            },
          ],
        },
        md: {
          css: [
            {
              h1: {
                fontSize: '3.5rem',
              },
              h2: {
                fontSize: '1.5rem',
              },
            },
          ],
        },
      },
    },
  },
}

export default config
