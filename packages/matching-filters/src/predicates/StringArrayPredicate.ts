import { Predicate, Predicates } from '@studnicky/types/browser';

export const StringArrayPredicate = Predicate.arrayItems(Predicates.isString);
