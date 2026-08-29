import { Predicate, Predicates } from '@studnicky/types';

import { StringNumberMapPredicate } from './StringNumberMapPredicate.js';

export const VectorThresholdFilterValuePredicate = Predicate.and(
  Predicate.field('value', StringNumberMapPredicate),
  Predicate.field('threshold', Predicates.isFiniteNumber)
);
