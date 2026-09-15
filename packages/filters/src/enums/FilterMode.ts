/**
 * Filter modes for data filtering
 */

import { Frozen } from '@studnicky/json/node';

export const FilterMode = Frozen.deepFreeze({
  'CORE': {
    'BLACKLIST': (matchResult: boolean) => {
      const result = !matchResult;

      return result;
    },
    'WHITELIST': (result: boolean) => {return result;}
  }
});
