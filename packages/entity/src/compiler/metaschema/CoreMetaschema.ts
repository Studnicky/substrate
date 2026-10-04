/** The official draft 2020-12 'https://json-schema.org/draft/2020-12/meta/core' metaschema document, carried verbatim from the specification. */
export const CORE_METASCHEMA = {
  '$defs': {
    'anchorString': {
      'pattern': '^[A-Za-z_][-A-Za-z0-9._]*$',
      'type': 'string'
    },
    'uriReferenceString': {
      'format': 'uri-reference',
      'type': 'string'
    },
    'uriString': {
      'format': 'uri',
      'type': 'string'
    }
  },
  '$dynamicAnchor': 'meta',
  '$id': 'https://json-schema.org/draft/2020-12/meta/core',
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$vocabulary': {
    'https://json-schema.org/draft/2020-12/vocab/core': true
  },
  'properties': {
    '$anchor': {
      '$ref': '#/$defs/anchorString'
    },
    '$comment': {
      'type': 'string'
    },
    '$defs': {
      'additionalProperties': {
        '$dynamicRef': '#meta'
      },
      'type': 'object'
    },
    '$dynamicAnchor': {
      '$ref': '#/$defs/anchorString'
    },
    '$dynamicRef': {
      '$ref': '#/$defs/uriReferenceString'
    },
    '$id': {
      '$comment': 'Non-empty fragments not allowed.',
      '$ref': '#/$defs/uriReferenceString',
      'pattern': '^[^#]*#?$'
    },
    '$ref': {
      '$ref': '#/$defs/uriReferenceString'
    },
    '$schema': {
      '$ref': '#/$defs/uriString'
    },
    '$vocabulary': {
      'additionalProperties': {
        'type': 'boolean'
      },
      'propertyNames': {
        '$ref': '#/$defs/uriString'
      },
      'type': 'object'
    }
  },
  'title': 'Core vocabulary meta-schema',
  'type': [
    'object',
    'boolean'
  ]
} as const;
