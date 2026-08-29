/**
 * Matches regex metacharacters that must be escaped when converting a glob
 * pattern to a regular expression
 */
export const REGEX_SPECIAL_CHARS_PATTERN = /[.+?^${}()|[\]\\]/g;
