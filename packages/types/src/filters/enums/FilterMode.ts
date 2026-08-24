/**
 * Filter modes for data filtering
 */

import { deepFreeze } from '../utils/deepFreeze.js';

export const FilterMode = deepFreeze({
  'CORE': {
    'BLACKLIST': (result: boolean) => {return !result;},
    'WHITELIST': (result: boolean) => {return result;}
  }
});
