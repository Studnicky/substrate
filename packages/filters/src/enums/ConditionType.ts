/**
 * Condition types for compiled conditions
 */

import { DeepFreeze } from '../utils/deepFreeze.js';

export const ConditionType = DeepFreeze.deepFreeze({
  'CORE': {
    'FIELD': 'CORE.FIELD',
    'LOGICAL': 'CORE.LOGICAL'
  }
});
