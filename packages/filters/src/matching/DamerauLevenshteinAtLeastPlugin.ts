
import { DamerauLevenshteinScorer, Predicates } from '#runtime';

import { Plugin } from '../plugins/Plugin.js';
import { TextThresholdFilterValuePredicate } from './predicates/TextThresholdFilterValuePredicate.js';

export class DamerauLevenshteinAtLeastPlugin extends Plugin {
  protected override readonly namespace: string = 'DamerauLevenshteinAtLeastPlugin';

  public override operators = {
    'DAMERAU_LEVENSHTEIN_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!Predicates.isString(value) || !TextThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = DamerauLevenshteinScorer.score(value, filterValue.value) >= filterValue.threshold;
      return result;
    }
  };
}
