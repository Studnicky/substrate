import { Frozen } from '#runtime';
/**
 * Condition types for compiled conditions
 */


export const ConditionType = Frozen.deepFreeze({
  'CORE': {
    'FIELD': 'CORE.FIELD',
    'LOGICAL': 'CORE.LOGICAL'
  }
});
