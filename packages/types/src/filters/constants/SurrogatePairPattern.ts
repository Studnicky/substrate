/**
 * Matches surrogate pair patterns in the high surrogate range (\uD800-\uD9FF)
 */
export const SURROGATE_PAIR_PATTERN = /\\u[dD][8-9a-fA-F][0-9a-fA-F]{2}/;
