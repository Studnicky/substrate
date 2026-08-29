import { Predicate, Predicates } from '@studnicky/types';

import { StringArrayPredicate } from './StringArrayPredicate.js';

export const StringArrayThresholdFilterValuePredicate = Predicate.and(
  Predicate.field('value', StringArrayPredicate),
  Predicate.field('threshold', Predicates.isFiniteNumber)
);
