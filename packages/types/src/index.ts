/**
 * @packageDocumentation
 * Shared runtime type-guard and object helpers for
 * @studnicky/substrate.
 *
 * Guards:
 *   - `Guard`            — pure-static type-safe accessors and type guards for wire format values
 *   - `JsonObject`       — narrowing guard for the JSON-object boundary (`JsonObject.is`)
 *   - `JsonValue`        — validation and coercion of `unknown` into canonical JSON data
 *
 * Objects:
 *   - `PickDefined`      — strips `undefined`-valued keys from a record, narrowing types (`PickDefined.from`)
 */

export { Empty } from './guards/Empty.js';
export { Guard } from './guards/Guard.js';
export { JsonObject } from './guards/JsonObject.js';
export { JsonValue } from './guards/JsonValue.js';
export { PickDefined } from './objects/PickDefined.js';
