import { Predicate, Predicates } from '@studnicky/types';

export const StringNumberMapPredicate = Predicate.mapEntries(Predicates.isString, Predicates.isFiniteNumber);
