import { Predicate, Predicates } from '#runtime';

export const StringArrayPredicate = Predicate.arrayItems(Predicates.isString);
