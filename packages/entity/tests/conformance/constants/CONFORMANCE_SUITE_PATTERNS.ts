/** Glob patterns, relative to the vendored suite root, selecting each measured suite slice. */
export const CONFORMANCE_SUITE_PATTERNS = Object.freeze({
  'optionalCore': 'tests/draft2020-12/optional/*.json',
  'optionalFormat': 'tests/draft2020-12/optional/format/*.json',
  'optionalFormatAssertion': 'tests/draft2020-12/optional/format-assertion.json',
  'required': 'tests/draft2020-12/*.json'
});
