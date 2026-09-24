/**
 * `ExcessPropertyType` for the keys of `TValue` absent from `keyof
 * TProperties`; resolves to `never` when `TValue` declares no excess key.
 * @module
 */
import type { ExcessPropertyType } from './ExcessPropertyType.js';

export type CheckAdditionalPropertiesType<
  TProperties,
  TValue,
  TPointer extends string
> = Exclude<keyof TValue, keyof TProperties> extends infer TExcess extends string
  ? [TExcess] extends [never]
    ? never
    : ExcessPropertyType<TExcess, TPointer>
  : never;
