import { Predicate, Predicates } from '@studnicky/types';

export const StringArrayPredicate = Predicate.arrayItems(Predicates.isString);
