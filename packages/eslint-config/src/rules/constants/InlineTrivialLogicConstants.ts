/**
 * Data constants for the `inline-trivial-logic` rule: the option defaults.
 *
 * `allowLiterals` DEFAULTS TO `true`. A function whose body reduces to a literal or template
 * literal — `static string(): string { return ''; }`, `` `${component}.${operation}` `` — IS
 * the value; it forwards to nothing. "Inline the logic at the call site" names a rewrite that
 * makes no sense for a body with no callee to inline — see the rule's own module comment for
 * the full reasoning (packages/types/src/guards/Empty.ts, packages/logger/src/modules/
 * LogEventName.ts). The option stays available, and staying `false` (or set explicitly) keeps
 * reporting literal returns for a consumer who wants that stricter posture.
 */
export const DEFAULT_OPTIONS: Readonly<{ 'allowLiterals': boolean; 'allowMemberExpressions': boolean }> = {
  'allowLiterals': true,
  'allowMemberExpressions': false
};
