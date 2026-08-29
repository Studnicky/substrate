/**
 * @packageDocumentation
 * Shared runtime type-guard and object helpers for
 * @studnicky/substrate.
 *
 * Guards:
 *   - `Predicates`       — pure-static type-safe accessors, type guards, and JSON Schema predicates
 *   - `JsonObject`       — narrowing guard for the JSON-object boundary (`JsonObject.is`)
 *   - `JsonValue`        — validation and coercion of `unknown` into canonical JSON data
 *
 * Objects:
 *   - `PickDefined`      — strips `undefined`-valued keys from a record, narrowing types (`PickDefined.from`)
 */

export { Empty } from './guards/Empty.js';
export { JsonObject } from './guards/JsonObject.js';
export { JsonValue } from './guards/JsonValue.js';
export type { PredicateFunctionInterface } from './interfaces/index.js';
export { PickDefined } from './objects/PickDefined.js';
export { TIME_ONLY_PATTERN } from './predicates/constants/TimeOnlyPattern.js';
export { Predicate } from './predicates/Predicate.js';
export { Predicates } from './predicates/Predicates.js';
