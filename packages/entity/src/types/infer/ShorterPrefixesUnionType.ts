/** Union of every prefix of `TArray` strictly shorter than `TArray` itself — the array's full length is handled by the caller. */
export type ShorterPrefixesUnionType<TArray extends unknown[], TAccum extends unknown[] = []>
  = TArray extends [infer THead, ...infer TRest] ? TAccum | ShorterPrefixesUnionType<TRest, [...TAccum, THead]> : never;
