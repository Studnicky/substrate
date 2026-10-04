/** Prepends `TRequired` onto every member of a tuple union, distributing over the union naturally. */
export type PrependRequiredPrefixType<TRequired extends unknown[], TUnion> = TUnion extends unknown[] ? [...TRequired, ...TUnion] : never;
