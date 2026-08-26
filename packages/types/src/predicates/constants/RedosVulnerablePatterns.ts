/**
 * Simplified ReDoS detection patterns
 */

export const REDOS_VULNERABLE_PATTERNS: readonly RegExp[] = [
  // (.*)*+ pattern
  /(\(.*\*.*\))\+/,
  // (.+)+ pattern
  /(\(.*\+.*\))\+/,
  // Nested quantifiers like .*.*
  /\*.*\*/,
  // Nested quantifiers like .+.+
  /\+.*\+/,
  // Multiple range quantifiers
  /\{.*,.*\}.*\{.*,.*\}/
];
