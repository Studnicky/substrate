/**
 * Constants for @studnicky/predicates
 */

/** Scaling factor applied to `Number.EPSILON` when testing `multipleOf`. */
export const MULTIPLE_OF_EPSILON_FACTOR = 10;

/** Content encodings actively validated at runtime. */
export const SUPPORTED_CONTENT_ENCODINGS: ReadonlySet<string> = new Set(['base64', 'base64url']);

/** Content media types actively validated at runtime. */
export const SUPPORTED_CONTENT_MEDIA_TYPES: ReadonlySet<string> = new Set(['application/json']);

/** Max distinct compiled `pattern` regexes cached by `checkPattern`; bounds memory against untrusted schema input. */
export const PATTERN_CACHE_CAPACITY = 500;
