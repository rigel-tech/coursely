/**
 * Commit messages follow Conventional Commits:
 *
 *   <type>(<scope>): <subject>
 *   feat(courses): add lesson progress tracking
 *
 * The type list, casing, length and structure rules all come from
 * `@commitlint/config-conventional`. Only the deviations from it are declared here,
 * so nothing is validated twice. Run `pnpm exec commitlint --print-config` to see
 * the resolved rule set.
 *
 * @type {import('@commitlint/types').UserConfig}
 */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // config-conventional accepts any lower-case scope; require kebab-case.
    'scope-case': [2, 'always', 'kebab-case'],
    // Bodies and footers carry URLs, stack traces and trailers that must not be wrapped.
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
}

export default config
