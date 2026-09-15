/**
 * Condition types for compiled conditions
 */

import { Frozen } from '@studnicky/json/node';

export const ConditionType = Frozen.deepFreeze({
  'CORE': {
    'FIELD': 'CORE.FIELD',
    'LOGICAL': 'CORE.LOGICAL'
  }
});
