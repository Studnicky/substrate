/**
 * Matches regex metacharacters that must be escaped before embedding text in a dynamic pattern
 */

export const ESCAPE_REGEX_CHARACTERS_PATTERN = /[.*+?^${}()|[\]\\]/g;
