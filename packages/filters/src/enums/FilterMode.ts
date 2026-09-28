/**
 * Filter modes for data filtering
 */

import { Frozen } from '@studnicky/json/browser';

/** Filter mode implementations backing `FilterMode.CORE`. */
class FilterModeHandlers {
  public static blacklist(matchResult: boolean): boolean {
    const result = !matchResult;

    return result;
  }
}

export const FilterMode = Frozen.deepFreeze({
  'CORE': {
    'BLACKLIST': FilterModeHandlers.blacklist,
    'WHITELIST': (result: boolean) => {return result;}
  }
});
