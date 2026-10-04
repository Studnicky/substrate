import { JaroWinklerScorer } from '@studnicky/matching/scorers';
import { Predicates } from '@studnicky/types/browser';

import { Plugin } from '../plugins/Plugin.js';
import { TextThresholdFilterValuePredicate } from './predicates/TextThresholdFilterValuePredicate.js';

export class JaroWinklerAtLeastPlugin extends Plugin {
  protected override readonly namespace: string = 'JaroWinklerAtLeastPlugin';

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
