import type { FilterValue } from './types.js';

import { Guard } from '../guards/Guard.js';

// WHY AN ENTITY, NOT A CAST.
//
// `FilterValue` is a recursive, non-JSON-Schema-representable union (it allows `Date`, `Set`,
// `Map`, alongside the JSON primitives), so it can't be validated through `SchemaValidator` —
// this hand-rolls the same shape-proving role `intake` plays everywhere else in this codebase.
// Anywhere untyped traversal data (`Reflect.get`'s `any`, `JSON.parse`'s `any`) needs to become a
// real `FilterValue`, it crosses through here — never through an `as FilterValue` assertion, which
// would just be an unchecked promise instead of a proven one.
//
// SHALLOW BY DESIGN. `intake` classifies exactly one level and recurses into children lazily
// through the SAME check — it does not eagerly walk and re-validate an entire subtree before a
// caller has asked for it. A path-traversal helper hopping through a large structure one segment
// at a time only needs each hop's classification, not the whole remaining tree validated up
// front; recursing eagerly here would make every single-property lookup pay for validating data
// nothing asked to see yet.

export namespace FilterValueEntity {
  export type Type = FilterValue;

  /**
   * Narrows an arbitrary value into `FilterValue`, throwing on anything outside the union
   * (a class instance, a function, a symbol) rather than silently passing it through.
   */
  export function intake(input: unknown): Type {
    if (input === null || input === undefined) {
      return input;
    }
    if (Guard.isString(input) || Guard.isNumber(input) || Guard.isBoolean(input) || Guard.isDate(input)) {
      return input;
    }
    if (Guard.isArray(input)) {
      const result = input.map((item) => {return intake(item);});
      return result;
    }
    if (Guard.isSet(input)) {
      const result = new Set([...input].map((item) => {return intake(item);}));
      return result;
    }
    if (Guard.isMap(input)) {
      const result = new Map([...input.entries()].map(([key, item]) => {return [String(key), intake(item)] as const;}));
      return result;
    }
    if (Guard.isRecord(input)) {
      const result: Record<string, FilterValue> = {};
      for (const [key, item] of Object.entries(input)) {
        result[key] = intake(item);
      }
      return result;
    }

    throw new TypeError(`Not a valid FilterValue: ${typeof input}`);
  }
}
