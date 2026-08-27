/**
 * Matches strings containing only ASCII digits (rejects trailing/leading non-digit garbage
 * that `Number.parseInt` would otherwise silently ignore).
 */

export const ALL_DIGITS_PATTERN = /^[0-9]+$/;
