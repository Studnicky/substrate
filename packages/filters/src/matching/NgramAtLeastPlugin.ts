import { NgramScorer } from '@studnicky/matching/scorers';
import { Predicates } from '@studnicky/types/browser';

import { Plugin } from '../plugins/Plugin.js';
import { NgramThresholdFilterValuePredicate } from './predicates/NgramThresholdFilterValuePredicate.js';

export class NgramAtLeastPlugin extends Plugin {
  protected override readonly namespace: string = 'NgramAtLeastPlugin';

  public override operators = {
    'NGRAM_AT_LEAST': (value: unknown, filterValue: unknown): boolean => {
      if (!Predicates.isString(value) || !NgramThresholdFilterValuePredicate(filterValue)) {
        return false;
      }
      const result = NgramScorer.score(value, filterValue.value, filterValue.size) >= filterValue.threshold;
      return result;
    }
  };
}
