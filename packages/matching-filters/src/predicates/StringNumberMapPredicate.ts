import { Predicate, Predicates } from '@studnicky/types/browser';

export const StringNumberMapPredicate = Predicate.mapEntries(Predicates.isString, Predicates.isFiniteNumber);
