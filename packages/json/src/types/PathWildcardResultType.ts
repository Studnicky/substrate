// json-schema-uninexpressible: 'array' is unknown[], since matched elements may be of any arbitrary type — unknown cannot be expressed in JSON Schema
/** Wildcard sentinel returned when `[*]` is encountered in a path expression. */
export type PathWildcardResultType = {
  'array': unknown[];
  'isWildcard': true;
  'remainingPath': string[];
};
