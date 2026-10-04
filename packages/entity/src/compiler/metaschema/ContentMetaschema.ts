/** The official draft 2020-12 'https://json-schema.org/draft/2020-12/meta/content' metaschema document, carried verbatim from the specification. */
export const CONTENT_METASCHEMA = {
  '$dynamicAnchor': 'meta',
  '$id': 'https://json-schema.org/draft/2020-12/meta/content',
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$vocabulary': {
    'https://json-schema.org/draft/2020-12/vocab/content': true
  },
  'properties': {
    'contentEncoding': {
      'type': 'string'
    },
    'contentMediaType': {
      'type': 'string'
    },
    'contentSchema': {
      '$dynamicRef': '#meta'
    }
  },
  'title': 'Content vocabulary meta-schema',
  'type': [
    'object',
    'boolean'
  ]
} as const;
