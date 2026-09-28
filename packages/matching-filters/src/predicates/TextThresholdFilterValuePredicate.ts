import { Predicate, Predicates } from '@studnicky/types/browser';

export const TextThresholdFilterValuePredicate = Predicate.and(
  Predicate.field('value', Predicates.isString),
  Predicate.field('threshold', Predicates.isFiniteNumber)
);
