import type { SchemaResourceIndexConstantsInterface } from '../../interfaces/SchemaResourceIndexConstantsInterface.js';

export const SCHEMA_RESOURCE_INDEX_CONSTANTS: SchemaResourceIndexConstantsInterface = Object.freeze({
  'structuralChildArrayKeys': ['allOf', 'anyOf', 'items', 'oneOf', 'prefixItems'],
  'structuralChildKeys': ['additionalProperties', 'contains', 'else', 'if', 'not', 'propertyNames', 'then'],
  'structuralChildMapKeys': ['$defs', 'dependentSchemas', 'patternProperties', 'properties']
});
