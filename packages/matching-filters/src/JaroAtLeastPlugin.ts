import { Plugin } from '@studnicky/filters/node';
import { JaroScorer } from '@studnicky/matching/node';
import { Predicates } from '@studnicky/types/node';

import { TextThresholdFilterValuePredicate } from './predicates/TextThresholdFilterValuePredicate.js';

export class JaroAtLeastPlugin extends Plugin {
  public override operators = {
    'JARO_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!Predicates.isString(value) || !TextThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = JaroScorer.score(value, filterValue.value) >= filterValue.threshold;
      return result;
    }
  };
}
