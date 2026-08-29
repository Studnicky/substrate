/**
 * Upper bound on a `.MATCHES`/`.REGEX` filter pattern before the unicode-escape and
 * regex-like heuristics run against it. `REGEX_LIKE_PATTERN`, `UNICODE_PROPERTY_ESCAPE_PATTERN`,
 * and `UNICODE_CODE_POINT_ESCAPE_PATTERN` each scan for an unbounded run terminated by a
 * specific closing character; against a long string with no terminator, every scan start
 * position pays the full unmatched span, making the check O(n²). No legitimate filter
 * pattern is anywhere near this long, so capping the input first bounds the cost without
 * rejecting any real pattern.
 */
export const MAXIMUM_HEURISTIC_PATTERN_LENGTH = 500;
