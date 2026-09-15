import { Predicate, Predicates } from '@studnicky/types/node';

import { TextThresholdFilterValuePredicate } from './TextThresholdFilterValuePredicate.js';

export const NgramThresholdFilterValuePredicate = Predicate.and(
  TextThresholdFilterValuePredicate,
  Predicate.field('size', Predicates.isPositiveInteger)
);
