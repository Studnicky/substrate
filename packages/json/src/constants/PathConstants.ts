/** Prototype-pollution safe property deny-list used by {@link Path}. */
export const DANGEROUS_PROPERTIES = new Set([
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  '__proto__',
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'prototype',
  'toString',
  'valueOf'
]);

/** Identifier-safe path segment pattern used by {@link Path}. */
export const VALID_IDENTIFIER = /^[$_a-zA-Z][$_a-zA-Z0-9]*$/u;

/** Matches a purely-numeric path segment (array index) used by {@link Path}. */
export const NUMERIC_SEGMENT_PATTERN = /^\d+$/u;

/** Matches bracket-quoted key syntax (e.g. `["special.key"]`) used by {@link Path}. */
export const BRACKET_QUOTED_KEY_PATTERN = /\["(?:[^"]+)"\]/gu;
