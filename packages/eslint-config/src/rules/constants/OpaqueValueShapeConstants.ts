/**
 * Data constants for the `OpaqueValueShape` opacity check used by `intake-parse-only`.
 *
 * `REFLECT_KEYED_METHODS` is the complete, fixed set of `Reflect` operations that take a
 * property-key argument — `Reflect.get`/`set`/`has`/`deleteProperty` are the entire ECMAScript
 * surface of that shape, so unlike `structuralProperties` (see `IntakeParseOnlyConstants.ts`)
 * this one isn't configurable: there is nothing for a consumer to extend it with.
 */

export const REFLECT_KEYED_METHODS: ReadonlySet<string> = new Set(['deleteProperty', 'get', 'has', 'set']);
