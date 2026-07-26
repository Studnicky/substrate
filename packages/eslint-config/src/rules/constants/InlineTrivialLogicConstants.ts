/** Data constants for the `inline-trivial-logic` rule: the option defaults and the leading-whitespace pattern used to re-indent a fixed-up statement. */

export const DEFAULT_OPTIONS: Readonly<{ 'allowLiterals': boolean; 'allowMemberExpressions': boolean }> = {
  'allowLiterals': false,
  'allowMemberExpressions': false
};

export const LEADING_WHITESPACE_PATTERN = /^\s*/v;
