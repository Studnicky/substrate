/**
 * Standard property names used in filter configurations
 */

import { deepFreeze } from '../utils/deepFreeze.js';

export const PropertyName = deepFreeze({
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
