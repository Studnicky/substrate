/** Data constants for the `for-of-arrays` rule: the array iterator-producing methods matched by resolved signature, not by callee name. */

export const ARRAY_ITERATOR_METHODS: ReadonlySet<string> = new Set([
  'entries',
  'keys',
  'values'
]);

export const ARRAY_ITERATOR_OWNERS: ReadonlySet<string> = new Set([
  'Array',
  'ReadonlyArray'
]);
