/** Data constants for the `prefer-collection-types` rule: the option defaults and the iteration-callback method names that a nested `.includes()`/`.indexOf()` match is attributed back to. */

export const DEFAULT_OPTIONS: Readonly<{
  'checkArrayLiterals': boolean;
  'checkFromEntries': boolean;
  'checkModuleScopeArrays': boolean;
}> = {
  'checkArrayLiterals': true,
  'checkFromEntries': true,
  'checkModuleScopeArrays': true
};

export const ITERATION_METHODS: ReadonlySet<string> = new Set(['every', 'filter', 'find', 'findIndex', 'some']);
