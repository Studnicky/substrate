/** Matches a literal `~` when escaping a JSON Pointer segment (RFC-6901). */
export const TILDE_PATTERN = /~/gu;

/** Matches a literal `/` when escaping a JSON Pointer segment (RFC-6901). */
export const SLASH_PATTERN = /\//gu;

/** Matches the escaped-slash sequence `~1` when unescaping a JSON Pointer segment (RFC-6901). */
export const ESCAPED_SLASH_PATTERN = /~1/gu;

/** Matches the escaped-tilde sequence `~0` when unescaping a JSON Pointer segment (RFC-6901). */
export const ESCAPED_TILDE_PATTERN = /~0/gu;
