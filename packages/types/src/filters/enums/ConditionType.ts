/**
 * Condition types for compiled conditions
 */

import { deepFreeze } from '../utils/deepFreeze.js';

export const ConditionType = deepFreeze({
  'CORE': {
    'FIELD': 'CORE.FIELD',
    'LOGICAL': 'CORE.LOGICAL'
  }
});
