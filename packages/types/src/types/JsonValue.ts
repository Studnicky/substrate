/**
 * A recursively-defined JSON-safe value.
 *
 * All branches are readonly so that a `JsonValueType` can be assigned to a
 * `ReadonlyArray` or a `Readonly` object without widening.
 */
export type JsonValueType
  = | string
  | number
  | boolean
  | null
  | readonly JsonValueType[]
  | { readonly [k: string]: JsonValueType };
