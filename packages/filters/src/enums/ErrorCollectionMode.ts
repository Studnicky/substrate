/**
 * Error collection strategies for evaluation
 */


import { Frozen } from '@studnicky/json/node';

export const ErrorCollectionMode = Frozen.deepFreeze({
  'FIRST': 'FIRST',
  'FULL': 'FULL',
  'NONE': 'NONE'
});
