/** The official draft 2020-12 'https://json-schema.org/draft/2020-12/meta/meta-data' metaschema document, carried verbatim from the specification. */
export const META_DATA_METASCHEMA = {
  '$dynamicAnchor': 'meta',
  '$id': 'https://json-schema.org/draft/2020-12/meta/meta-data',
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$vocabulary': {
    'https://json-schema.org/draft/2020-12/vocab/meta-data': true
  },
  'properties': {
    'default': true,
    'deprecated': {
      'default': false,
      'type': 'boolean'
    },
    'description': {
      'type': 'string'
    },
    'examples': {
      'items': true,
      'type': 'array'
    },
    'readOnly': {
      'default': false,
      'type': 'boolean'
    },
    'title': {
      'type': 'string'
    },
    'writeOnly': {
      'default': false,
      'type': 'boolean'
    }
  },
  'title': 'Meta-data vocabulary meta-schema',
  'type': [
    'object',
    'boolean'
  ]
} as const;
