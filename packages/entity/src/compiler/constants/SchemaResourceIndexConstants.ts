export const SCHEMA_RESOURCE_INDEX_CONSTANTS = Object.freeze({
  'structuralChildArrayKeys': ['allOf', 'anyOf', 'items', 'oneOf', 'prefixItems'] as readonly string[],
  'structuralChildKeys': ['additionalProperties', 'contains', 'else', 'if', 'not', 'propertyNames', 'then'] as readonly string[],
  'structuralChildMapKeys': ['$defs', 'dependentSchemas', 'patternProperties', 'properties'] as readonly string[]
});
