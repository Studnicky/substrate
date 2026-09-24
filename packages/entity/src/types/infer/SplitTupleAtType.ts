/** Splits `TArray` into its first `TCount` elements and the remainder; clamps when `TCount` exceeds `TArray`'s length. */
export type SplitTupleAtType<TArray extends unknown[], TCount extends number, TTaken extends unknown[] = []>
  = TTaken['length'] extends TCount
    ? { 'rest': TArray; 'taken': TTaken }
    : TArray extends [infer THead, ...infer TRest]
      ? SplitTupleAtType<TRest, TCount, [...TTaken, THead]>
      : { 'rest': TArray; 'taken': TTaken };
