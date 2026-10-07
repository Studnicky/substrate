import { Frozen } from '#runtime';
/**
 * Standard property names used in filter configurations
 */


export const PropertyName = Frozen.deepFreeze({
  'CORE': {
    'CONDITIONS': 'conditions',
    'CONFIG': 'config',
    'FIELD': 'field',
    'GATE': 'gate',
    'NEGATE': 'negate',
    'OPERATOR': 'operator',
    'PATH': 'path',
    'PATHWAY': 'pathway',
    'THRESHOLD': 'threshold',
    'TYPE': 'type',
    'VALUE': 'value'
  }
} as const);
