/** Wildcard sentinel returned when `[*]` is encountered in a path expression. */
export type PathWildcardResultType = {
  readonly 'array': unknown[];
  readonly 'isWildcard': true;
  readonly 'remainingPath': readonly string[];
};
