/** The official draft 2020-12 'https://json-schema.org/draft/2020-12/meta/unevaluated' metaschema document, carried verbatim from the specification. */
export const UNEVALUATED_METASCHEMA = {
  '$dynamicAnchor': 'meta',
  '$id': 'https://json-schema.org/draft/2020-12/meta/unevaluated',
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$vocabulary': {
    'https://json-schema.org/draft/2020-12/vocab/unevaluated': true
  },
  'properties': {
    'unevaluatedItems': {
      '$dynamicRef': '#meta'
    },
    'unevaluatedProperties': {
      '$dynamicRef': '#meta'
    }
  },
  'title': 'Unevaluated applicator vocabulary meta-schema',
  'type': [
    'object',
    'boolean'
  ]
} as const;
