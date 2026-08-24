/**
 * Error collection strategies for evaluation
 */


import { deepFreeze } from '../utils/deepFreeze.js';

export const ErrorCollectionMode = deepFreeze({
  'FIRST': (errors: Error[], newError: Error): boolean => {
    if (errors.length === 0) {
      errors.push(newError);
    }

    return errors.length >= 1;
  },
  'FULL': (errors: Error[], newError: Error): boolean => {
    errors.push(newError);

    return false;
  },
  'NONE': (_errors: Error[], _newError: Error): boolean => {
    return true;
  }
});
