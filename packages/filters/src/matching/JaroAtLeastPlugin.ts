import { JaroScorer } from '@studnicky/matching/scorers';
import { Predicates } from '@studnicky/types/browser';

import { Plugin } from '../plugins/Plugin.js';
import { TextThresholdFilterValuePredicate } from './predicates/TextThresholdFilterValuePredicate.js';

export class JaroAtLeastPlugin extends Plugin {
  protected override readonly namespace: string = 'JaroAtLeastPlugin';

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
