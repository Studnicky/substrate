import { Predicate, Predicates } from '#runtime';

export const StringNumberMapPredicate = Predicate.mapEntries(Predicates.isString, Predicates.isFiniteNumber);
