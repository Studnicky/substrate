// Reusable JSON-schema fragment for meta.schema in layer-boundary rules.
// Consumers spread this as the sole positional-options entry: 'schema': [layerOptionsSchema]
export const layerOptionsSchema = {
  'additionalProperties': false,
  'properties': {
    'aliasPrefixes': {
      'additionalProperties': { 'type': 'string' },
      'description': 'Map of path-alias prefixes (e.g. "@domain/") to their layer name.',
      'type': 'object'
    },
    'allowedImports': {
      'additionalProperties': {
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'description': 'Override of the default allow-matrix: source layer name -> list of layers it may import from.',
      'type': 'object'
    },
    'layers': {
      'description': 'Ordered list of enforced layer names, e.g. ["domain", "ports", "application", "adapters", "infrastructure"].',
      'items': { 'type': 'string' },
      'type': 'array'
    },
    'sourceRoot': {
      'description': 'Path segment(s) after which the layer name appears, e.g. "src".',
      'type': 'string'
    }
  },
  'required': ['layers', 'sourceRoot'],
  'type': 'object'
} as const;
