/**
 * Error collection strategies for evaluation
 */


import { DeepFreeze } from '../utils/deepFreeze.js';

export const ErrorCollectionMode = DeepFreeze.deepFreeze({
  'FIRST': 'FIRST',
  'FULL': 'FULL',
  'NONE': 'NONE'
});
