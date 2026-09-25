/**
 * @packageDocumentation
 * Shared runtime type-guard and object helpers for
 * @studnicky/substrate.
 *
 * Guards:
 *   - `Predicates`       — pure-static type-safe accessors, type guards, and JSON Schema predicates
 *   - `JsonObject`       — narrowing guard and trust-boundary writes for plain objects (`JsonObject.is`, `.fromEntries`, `.write`)
 *   - `JsonValue`        — validation and coercion of `unknown` into canonical JSON data
 *   - `RuntimeValue`     — validation of runtime operands that retain native values
 *
 * Objects:
 *   - `Hash`             — FNV-1a structural hashing for arbitrary in-memory values (`Hash.value`)
 *   - `PickDefined`      — strips `undefined`-valued keys from a record, narrowing types (`PickDefined.from`)
 *   - `StructuralHash`   — schema hashing with metadata-key stripping (`StructuralHash.of`)
 */

export { Empty } from './guards/Empty.js';
export { JsonObject } from './guards/JsonObject.js';
export { JsonValue } from './guards/JsonValue.js';
export { RuntimeValue } from './guards/RuntimeValue.js';
export type { PredicateFunctionInterface } from './interfaces/index.js';
export { Hash } from './objects/Hash.js';
export { PickDefined } from './objects/PickDefined.js';
export { StructuralHash } from './objects/StructuralHash.js';
export { TIME_ONLY_PATTERN } from './predicates/constants/TimeOnlyPattern.js';
export { Predicate } from './predicates/Predicate.js';
export { Predicates } from './predicates/Predicates.js';
