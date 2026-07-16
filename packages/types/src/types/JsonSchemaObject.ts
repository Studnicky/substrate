import type { JsonSchemaType } from './JsonSchema.js';
import type { JsonSchemaTypeNameType } from './JsonSchemaTypeName.js';

/**
 * A JSON Schema 2020-12 keyword object.
 *
 * All keyword fields are optional; only the keywords applicable to the
 * schema's type need be present.
 */
// json-schema-uninexpressible: this IS the JSON Schema keyword-object type itself, part of the schema-typing infrastructure (FromSchema/JsonSchemaObjectType) — it cannot be derived from a JSON Schema it defines the shape of
export type JsonSchemaObjectType = {
  '$anchor'?: string;
  '$comment'?: string;
  '$defs'?: { [name: string]: JsonSchemaType };
  '$dynamicAnchor'?: string;
  '$dynamicRef'?: string;
  '$id'?: string;
  '$ref'?: string;
  // ── Core: identifiers and references ────────────────────────────
  '$schema'?: string;
  '$vocabulary'?: { [uri: string]: boolean };

  'additionalProperties'?: JsonSchemaType;
  // ── Applicators: composition ────────────────────────────────────
  'allOf'?: JsonSchemaType[];
  'anyOf'?: JsonSchemaType[];
  'const'?: unknown;

  'contains'?: JsonSchemaType;
  // ── Content ─────────────────────────────────────────────────────
  'contentEncoding'?: string;
  'contentMediaType'?: string;

  'contentSchema'?: JsonSchemaType;
  'default'?: unknown;
  'dependentRequired'?: { [name: string]: string[] };
  'dependentSchemas'?: { [name: string]: JsonSchemaType };
  'deprecated'?: boolean;
  'description'?: string;

  'else'?: JsonSchemaType;
  'enum'?: unknown[];
  'examples'?: unknown[];
  'exclusiveMaximum'?: number;

  'exclusiveMinimum'?: number;
  // ── Format (annotation by default in 2020-12) ───────────────────
  'format'?: string;
  // ── Applicators: conditional ────────────────────────────────────
  'if'?: JsonSchemaType;

  'items'?: JsonSchemaType;
  'maxContains'?: number;
  'maximum'?: number;
  // ── Validation: arrays ──────────────────────────────────────────
  'maxItems'?: number;
  // ── Validation: strings ─────────────────────────────────────────
  'maxLength'?: number;

  // ── Validation: objects ─────────────────────────────────────────
  'maxProperties'?: number;
  'minContains'?: number;
  'minimum'?: number;

  'minItems'?: number;
  'minLength'?: number;
  'minProperties'?: number;
  // ── Validation: numbers ─────────────────────────────────────────
  'multipleOf'?: number;
  'not'?: JsonSchemaType;

  'oneOf'?: JsonSchemaType[];
  'pattern'?: string;
  'patternProperties'?: { [regex: string]: JsonSchemaType };
  // ── Applicators: arrays ─────────────────────────────────────────
  'prefixItems'?: JsonSchemaType[];

  // ── Applicators: objects ────────────────────────────────────────
  'properties'?: { [name: string]: JsonSchemaType };

  'propertyNames'?: JsonSchemaType;
  'readOnly'?: boolean;
  'required'?: string[];

  'then'?: JsonSchemaType;
  // ── Meta-data ───────────────────────────────────────────────────
  'title'?: string;
  // ── Validation: any instance ────────────────────────────────────
  'type'?: JsonSchemaTypeNameType | JsonSchemaTypeNameType[];
  'unevaluatedItems'?: JsonSchemaType;
  'unevaluatedProperties'?: JsonSchemaType;
  'uniqueItems'?: boolean;
  'writeOnly'?: boolean;
};
