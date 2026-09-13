import { Predicate, Predicates } from '@studnicky/types/node';

export const StringNumberMapPredicate = Predicate.mapEntries(Predicates.isString, Predicates.isFiniteNumber);
