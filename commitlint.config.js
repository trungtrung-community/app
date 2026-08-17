/**
 * @fileoverview Conventional commits, checked at commit-msg.
 *
 * This defends existing practice rather than imposing a new rule: every commit in this
 * repo and in the design-system repo beside it already reads `fix(ds):`, `chore(sync):`,
 * `test(components):`. The value is that it keeps doing so on a tired evening.
 *
 * Checked against the whole history before being turned on. A linter that rejects the
 * commits already in the log is one somebody disables inside a week — and the defaults
 * did reject one, which is the only reason the rule below is here.
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    /**
     * Sentence-case is allowed; the other three are not.
     *
     * The default forbids sentence-case too, which rejects
     * `refactor(components): Select opens a real Sheet` — where the capital is a component
     * name, not a style choice. Subjects here legitimately open with `Select`,
     * `mixedTibetan`, `TibetanText` or `RN`, and renaming the subject to satisfy a linter
     * would make the log worse than the rule makes it better.
     *
     * What is still refused is the part worth refusing: `Fix The Thing`, `FIX THE THING`,
     * `FixTheThing`.
     */
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
  },
};
