/**
 * RFC 9457 Problem Details constants for the entities in this package.
 *
 * @module
 */
import { PROBLEM_TYPE_BASE } from '@studnicky/types/browser';

/** RFC 9457 §4.2.1: the type a problem carries when it adds nothing beyond its status. */
export const PROBLEM_TYPE_BLANK = 'about:blank';

/** Problem type for a validation failure. */
export const PROBLEM_TYPE_VALIDATION = `${PROBLEM_TYPE_BASE}validation`;

/** Stable, occurrence-independent title paired with the validation problem type. */
export const PROBLEM_TITLE_VALIDATION = 'Validation failed';

/** Lowest and highest HTTP status codes RFC 9457 permits in a `status` member. */
export const PROBLEM_STATUS_MINIMUM = 100;
export const PROBLEM_STATUS_MAXIMUM = 599;
