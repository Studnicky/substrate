import type { PrependRequiredPrefixType } from './PrependRequiredPrefixType.js';
import type { ShorterPrefixesUnionType } from './ShorterPrefixesUnionType.js';
import type { SplitTupleAtType } from './SplitTupleAtType.js';

/**
 * `prefixItems` constrains position, not arity: an array with fewer elements than
 * `prefixItems` is valid, and one with more is valid unless the tail is closed.
 * Derives the open union `FromSchema` also derives — [] | [A] | ... | [A,...,N] | [A,...,N,...unknown[]] —
 * narrowed at the bottom by `TMinimumItemsCount` and closed at the top only when `TClosed` is `true`.
 */
export type InferOpenPrefixTupleStaticType<TFull extends unknown[], TMinimumItemsCount extends number, TClosed extends boolean>
  = SplitTupleAtType<TFull, TMinimumItemsCount> extends { 'rest': infer TRest extends unknown[]; 'taken': infer TTaken extends unknown[] }
    ? PrependRequiredPrefixType<TTaken, ShorterPrefixesUnionType<TRest> | (TClosed extends true ? TRest : [...TRest, ...unknown[]])>
    : never;
