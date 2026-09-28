/**
 * Union of `MissingRequiredPropertyType` for every `TRequired` entry absent
 * from `keyof TProperties`; resolves to `never` when all are present.
 * Distributes over the `TRequired` union in tail position — one check per
 * member, no recursive walk.
 * @module
 */
import type { MissingRequiredPropertyType } from './MissingRequiredPropertyType.js';

export type CheckRequiredPropertiesType<
  TRequired extends readonly string[],
  TProperties,
  TPointer extends string
> = TRequired[number] extends infer TKey extends string
  ? TKey extends keyof TProperties
    ? never
    : MissingRequiredPropertyType<TKey, TPointer>
  : never;
