/**
 * RFC 9457 Problem Details constants for thrown-value projection.
 *
 * RFC 9457 (which obsoletes RFC 7807) makes `type` — a URI reference — the problem's
 * discriminant: "the problem type" is identified by that URI, and `title` is its stable
 * human-readable name. A separate classification member is therefore redundant.
 *
 * @module
 */

/** Namespace every problem type URI minted by this workspace is rooted at. */
export const PROBLEM_TYPE_BASE = 'https://problems.studnicky.dev/';

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

/** Stable, occurrence-independent titles paired with each minted problem type. */
export const PROBLEM_TITLE_THROWN_NULLISH = 'Nullish value thrown';
export const PROBLEM_TITLE_THROWN_STRING = 'String thrown';
export const PROBLEM_TITLE_THROWN_PRIMITIVE = 'Primitive thrown';
export const PROBLEM_TITLE_THROWN_OBJECT = 'Non-error object thrown';
export const PROBLEM_TITLE_ERROR = 'Error';
export const PROBLEM_TITLE_AGGREGATE_ERROR = 'Aggregate error';
