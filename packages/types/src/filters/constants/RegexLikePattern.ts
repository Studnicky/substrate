/**
 * Detects a pattern that already looks like a regular expression (anchors,
 * groups, or character-class shorthand) rather than a glob-style MATCHES pattern
 */
export const REGEX_LIKE_PATTERN = /^[\\^]|\$|[[(].*[\])]|[\\][dDsSwW]/;
