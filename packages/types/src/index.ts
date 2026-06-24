/**
 * @packageDocumentation
 * Shared zero-runtime utility types and type-guard helpers for
 * @studnicky/substrate.
 *
 * Types:
 *   - `JsonValueType`        — recursive readonly JSON-safe value
 *   - `JsonObjectType`       — `Record<string, unknown>` for unvalidated JSON objects
 *   - `DeepReadonlyType<T>`  — recursive readonly wrapper (Array/Set/Map/object)
 *   - `DeepMergeType<TBase, TOverlay>` — type-level deep merge
 *   - `JsonSchemaType`       — JSON Schema 2020-12 (object keyword form or boolean)
 *   - `JsonSchemaObjectType` — JSON Schema 2020-12 keyword object
 *   - `JsonSchemaTypeNameType` — the seven primitive type names
 *
 * Guards (also available via `@studnicky/types/guards`):
 *   - `Guard`            — pure-static type-safe accessors and type guards for wire format values
 */

export { Empty } from './guards/Empty.js';
export { Guard } from './guards/Guard.js';
export type { DeepMergeType } from './types/DeepMergeType.js';
export type { DeepReadonlyType } from './types/DeepReadonly.js';
export type { JsonObjectType } from './types/JsonObject.js';
export type { JsonSchemaType } from './types/JsonSchema.js';
export type { JsonSchemaObjectType } from './types/JsonSchemaObject.js';
export type { JsonSchemaTypeNameType } from './types/JsonSchemaTypeName.js';
export type { JsonValueType } from './types/JsonValue.js';
export type { FromSchema } from 'json-schema-to-ts';
