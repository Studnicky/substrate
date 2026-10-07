import { LevenshteinScorer } from '@studnicky/matching/browser';
import { Predicates } from '@studnicky/types/browser';

import { Plugin } from '../plugins/Plugin.js';
import { TextThresholdFilterValuePredicate } from './predicates/TextThresholdFilterValuePredicate.js';

export class LevenshteinAtLeastPlugin extends Plugin {
  protected override readonly namespace: string = 'LevenshteinAtLeastPlugin';

  public override operators = {
    'LEVENSHTEIN_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!Predicates.isString(value) || !TextThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = LevenshteinScorer.score(value, filterValue.value) >= filterValue.threshold;
      return result;
    }
  };
}
