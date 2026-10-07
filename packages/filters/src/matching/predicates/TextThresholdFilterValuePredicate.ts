import { Predicate, Predicates } from '#runtime';

export const TextThresholdFilterValuePredicate = Predicate.and(
  Predicate.field('value', Predicates.isString),
  Predicate.field('threshold', Predicates.isFiniteNumber)
);
