import { Predicate, Predicates } from '@studnicky/types/node';

export const StringArrayPredicate = Predicate.arrayItems(Predicates.isString);
