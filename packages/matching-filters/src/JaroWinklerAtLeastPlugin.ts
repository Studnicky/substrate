import { JaroWinklerScorer } from '@studnicky/matching';
import { Predicates } from '@studnicky/types';
import { Plugin } from '@studnicky/types/filters';

import { TextThresholdFilterValuePredicate } from './predicates/TextThresholdFilterValuePredicate.js';

export class JaroWinklerAtLeastPlugin extends Plugin {
  public override operators = {
    'JARO_WINKLER_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!Predicates.isString(value) || !TextThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = JaroWinklerScorer.score(value, filterValue.value) >= filterValue.threshold;
      return result;
    }
  };
}
