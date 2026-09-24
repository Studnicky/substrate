/** The official draft 2020-12 'https://json-schema.org/draft/2020-12/meta/validation' metaschema document, carried verbatim from the specification. */
export const VALIDATION_METASCHEMA = {
  '$defs': {
    'nonNegativeInteger': {
      'minimum': 0,
      'type': 'integer'
    },
    'nonNegativeIntegerDefault0': {
      '$ref': '#/$defs/nonNegativeInteger',
      'default': 0
    },
    'simpleTypes': {
      'enum': [
        'array',
        'boolean',
        'integer',
        'null',
        'number',
        'object',
        'string'
      ]
    },
    'stringArray': {
      'default': [],
      'items': {
        'type': 'string'
      },
      'type': 'array',
      'uniqueItems': true
    }
  },
  '$dynamicAnchor': 'meta',
  '$id': 'https://json-schema.org/draft/2020-12/meta/validation',
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$vocabulary': {
    'https://json-schema.org/draft/2020-12/vocab/validation': true
  },
  'properties': {
    'const': true,
    'dependentRequired': {
      'additionalProperties': {
        '$ref': '#/$defs/stringArray'
      },
      'type': 'object'
    },
    'enum': {
      'items': true,
      'type': 'array'
    },
    'exclusiveMaximum': {
      'type': 'number'
    },
    'exclusiveMinimum': {
      'type': 'number'
    },
    'maxContains': {
      '$ref': '#/$defs/nonNegativeInteger'
    },
    'maximum': {
      'type': 'number'
    },
    'maxItems': {
      '$ref': '#/$defs/nonNegativeInteger'
    },
    'maxLength': {
      '$ref': '#/$defs/nonNegativeInteger'
    },
    'maxProperties': {
      '$ref': '#/$defs/nonNegativeInteger'
    },
    'minContains': {
      '$ref': '#/$defs/nonNegativeInteger',
      'default': 1
    },
    'minimum': {
      'type': 'number'
    },
    'minItems': {
      '$ref': '#/$defs/nonNegativeIntegerDefault0'
    },
    'minLength': {
      '$ref': '#/$defs/nonNegativeIntegerDefault0'
    },
    'minProperties': {
      '$ref': '#/$defs/nonNegativeIntegerDefault0'
    },
    'multipleOf': {
      'exclusiveMinimum': 0,
      'type': 'number'
    },
    'pattern': {
      'format': 'regex',
      'type': 'string'
    },
    'required': {
      '$ref': '#/$defs/stringArray'
    },
    'type': {
      'anyOf': [
        {
          '$ref': '#/$defs/simpleTypes'
        },
        {
          'items': {
            '$ref': '#/$defs/simpleTypes'
          },
          'minItems': 1,
          'type': 'array',
          'uniqueItems': true
        }
      ]
    },
    'uniqueItems': {
      'default': false,
      'type': 'boolean'
    }
  },
  'title': 'Validation vocabulary meta-schema',
  'type': [
    'object',
    'boolean'
  ]
} as const;
