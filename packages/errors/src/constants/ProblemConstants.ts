/**
 * RFC 9457 Problem Details constants.
 *
 * RFC 9457 (which obsoletes RFC 7807) makes `type` — a URI reference — the problem's
 * discriminant: "the problem type" is identified by that URI, and `title` is its stable
 * human-readable name. A separate classification member is therefore redundant, which is
 * why the projection entities in this package carry no discriminant of their own.
 *
 * @module
 */

/** Namespace every problem type URI minted by this workspace is rooted at. */
export const PROBLEM_TYPE_BASE = 'https://problems.studnicky.dev/';

/** RFC 9457 §4.2.1: the type a problem carries when it adds nothing beyond its status. */
export const PROBLEM_TYPE_BLANK = 'about:blank';

/** Problem type for a caught value that was `null` or `undefined`. */
export const PROBLEM_TYPE_THROWN_NULLISH = `${PROBLEM_TYPE_BASE}thrown-nullish`;

/** Problem type for a caught value that was a bare string. */
export const PROBLEM_TYPE_THROWN_STRING = `${PROBLEM_TYPE_BASE}thrown-string`;

/** Problem type for a caught value that was a non-string primitive. */
export const PROBLEM_TYPE_THROWN_PRIMITIVE = `${PROBLEM_TYPE_BASE}thrown-primitive`;

/** Problem type for a caught value that was an object but not an `Error`. */
export const PROBLEM_TYPE_THROWN_OBJECT = `${PROBLEM_TYPE_BASE}thrown-object`;

/** Problem type for a caught native `Error`. */
export const PROBLEM_TYPE_ERROR = `${PROBLEM_TYPE_BASE}error`;

/** Problem type for a caught `AggregateError`. */
export const PROBLEM_TYPE_AGGREGATE_ERROR = `${PROBLEM_TYPE_BASE}aggregate-error`;

/** Problem type for a validation failure. */
export const PROBLEM_TYPE_VALIDATION = `${PROBLEM_TYPE_BASE}validation`;

/** Stable, occurrence-independent titles paired with each minted problem type. */
export const PROBLEM_TITLE_THROWN_NULLISH = 'Nullish value thrown';
export const PROBLEM_TITLE_THROWN_STRING = 'String thrown';
export const PROBLEM_TITLE_THROWN_PRIMITIVE = 'Primitive thrown';
export const PROBLEM_TITLE_THROWN_OBJECT = 'Non-error object thrown';
export const PROBLEM_TITLE_ERROR = 'Error';
export const PROBLEM_TITLE_AGGREGATE_ERROR = 'Aggregate error';
export const PROBLEM_TITLE_VALIDATION = 'Validation failed';

/** Lowest and highest HTTP status codes RFC 9457 permits in a `status` member. */
export const PROBLEM_STATUS_MINIMUM = 100;
export const PROBLEM_STATUS_MAXIMUM = 599;
