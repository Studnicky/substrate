/**
 * Filter modes for data filtering
 */

import { DeepFreeze } from '../utils/deepFreeze.js';

export const FilterMode = DeepFreeze.deepFreeze({
  'CORE': {
    'BLACKLIST': (result: boolean) => {return !result;},
    'WHITELIST': (result: boolean) => {return result;}
  }
});
