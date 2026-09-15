/** Member names grouped by the runtime contract used to validate filter conditions. */
export const FILTER_CONDITION_MEMBER_NAMES = Object.freeze({
  'boolean': Object.freeze([
    'caseSensitive',
    'inclusive',
    'negate'
  ]),
  'number': Object.freeze([
    'decimalPrecision',
    'index',
    'maximumValue',
    'minimumValue',
    'threshold'
  ]),
  'string': Object.freeze([
    'arrayLogic',
    'arrayPath',
    'field',
    'gate',
    'lowerValue',
    'operator',
    'path',
    'pathway',
    'phase',
    'rowGate',
    'type'
  ])
});
