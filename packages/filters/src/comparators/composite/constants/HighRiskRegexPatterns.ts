/**
 * Regex source shapes that indicate classic catastrophic-backtracking (ReDoS) constructs
 */

export const HIGH_RISK_REGEX_PATTERNS: readonly RegExp[] = [
  // ^(a+)+$ / ^(a*)*$ / ^(a?)+$ style anchored nested quantifiers
  /^\^?\([^)]*[+*?]\)[+*]\$?$/,
  // Anchored nested quantifiers using curly-brace repetition, e.g. ^(a{1,10})+$
  /^\^?\([^)]*\{[^}]+\}\)[+*]\$?$/,
  // (a+)+ nested plus quantifiers
  /\([^)]*\+\)\+/,
  // (a*)* nested star quantifiers
  /\([^)]*\*\)\*/,
  // ((a+)+)+ deeply nested quantifiers
  /\(\([^)]*[+*]\)[+*]\)[+*]/,
  // (a|a)* / (a|a)+ quantified alternation
  /^\^?\([^)|]*\|[^)]*\)[+*]\$?$/
];
