/**
 * Condition types for compiled conditions
 */

import { Frozen } from '@studnicky/json/browser';

export const ConditionType = Frozen.deepFreeze({
  'CORE': {
    'FIELD': 'CORE.FIELD',
    'LOGICAL': 'CORE.LOGICAL'
  }
});
