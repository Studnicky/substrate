/** The official draft 2020-12 'https://json-schema.org/draft/2020-12/meta/format-annotation' metaschema document, carried verbatim from the specification. */
export const FORMAT_ANNOTATION_METASCHEMA = {
  '$dynamicAnchor': 'meta',
  '$id': 'https://json-schema.org/draft/2020-12/meta/format-annotation',
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$vocabulary': {
    'https://json-schema.org/draft/2020-12/vocab/format-annotation': true
  },
  'properties': {
    'format': {
      'type': 'string'
    }
  },
  'title': 'Format vocabulary meta-schema for annotation results',
  'type': [
    'object',
    'boolean'
  ]
} as const;
