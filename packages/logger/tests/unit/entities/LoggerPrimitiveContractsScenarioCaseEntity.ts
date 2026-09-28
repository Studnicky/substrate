import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { LogLevelEntity } from '../../../src/entities/LogLevelEntity.js';
import { LogStatusEntity } from '../../../src/entities/LogStatusEntity.js';

const CONSOLE_METHODS = ['debug', 'error', 'info', 'trace', 'warn'] as const;

const nameSchema = { 'minLength': 1, 'type': 'string' } as const;
const nameNode = SchemaNode.defineString(nameSchema);
/** `LogLevelEntity.Node`'s own schema carries only `enum` (no `description`/`type`); this mirrors that flattened shape. */
const logLevelEnumSchema = { 'enum': LogLevelEntity.Schema.enum } as const;
/** `LogStatusEntity.Node`'s own schema carries only `enum` (no `description`/`type`); this mirrors that flattened shape. */
const logStatusEnumSchema = { 'enum': LogStatusEntity.Schema.enum } as const;
const numberLevelsSchema = {
  'additionalProperties': false,
  'properties': { 'DEBUG': { 'type': 'integer' }, 'ERROR': { 'type': 'integer' }, 'INFO': { 'type': 'integer' }, 'SILENT': { 'type': 'integer' }, 'TRACE': { 'type': 'integer' }, 'WARN': { 'type': 'integer' } },
  'required': ['DEBUG', 'ERROR', 'INFO', 'SILENT', 'TRACE', 'WARN'],
  'type': 'object'
} as const;
const numberLevelsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'DEBUG': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'ERROR': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'INFO': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'SILENT': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'TRACE': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'WARN': SchemaNode.defineNumber({ 'type': 'integer' } as const)
  }, ['DEBUG', 'ERROR', 'INFO', 'SILENT', 'TRACE', 'WARN'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const lowercaseLevelsSchema = {
  'additionalProperties': false,
  'properties': { 'debug': { 'type': 'integer' }, 'error': { 'type': 'integer' }, 'info': { 'type': 'integer' }, 'silent': { 'type': 'integer' }, 'trace': { 'type': 'integer' }, 'warn': { 'type': 'integer' } },
  'required': ['debug', 'error', 'info', 'silent', 'trace', 'warn'],
  'type': 'object'
} as const;
const lowercaseLevelsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'debug': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'error': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'info': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'silent': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'trace': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'warn': SchemaNode.defineNumber({ 'type': 'integer' } as const)
  }, ['debug', 'error', 'info', 'silent', 'trace', 'warn'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const invalidStringLevelsSchema = {
  'additionalProperties': false,
  'properties': {
    'empty': { 'type': 'integer' }, 'invalid': { 'type': 'integer' }, 'large': { 'type': 'integer' }, 'negative': { 'type': 'integer' },
    'spaced': { 'type': 'integer' }, 'title': { 'type': 'integer' }, 'uppercase': { 'type': 'integer' }
  },
  'required': ['empty', 'invalid', 'large', 'negative', 'spaced', 'title', 'uppercase'],
  'type': 'object'
} as const;
const invalidStringLevelsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'empty': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'invalid': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'large': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'negative': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'spaced': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'title': SchemaNode.defineNumber({ 'type': 'integer' } as const),
    'uppercase': SchemaNode.defineNumber({ 'type': 'integer' } as const)
  }, ['empty', 'invalid', 'large', 'negative', 'spaced', 'title', 'uppercase'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const anyObjectSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
const anyObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} });

const faultConfigSchema = {
  'additionalProperties': false,
  'properties': {
    'cause': { 'minLength': 1, 'type': 'string' },
    'component': { 'minLength': 1, 'type': 'string' },
    'context': anyObjectSchema,
    'durationMs': { 'minimum': 0, 'type': 'integer' },
    'message': { 'minLength': 1, 'type': 'string' },
    'name': { 'minLength': 1, 'type': 'string' },
    'operation': { 'minLength': 1, 'type': 'string' },
    'stack': { 'minLength': 1, 'type': 'string' },
    'status': logStatusEnumSchema
  },
  'required': ['component', 'context', 'message', 'name', 'operation', 'status'],
  'type': 'object'
} as const;
const faultConfigNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'cause': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'component': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'context': anyObjectNode,
    'durationMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'operation': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'stack': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'status': LogStatusEntity.Node
  }, ['component', 'context', 'message', 'name', 'operation', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const partialFaultConfigSchema = {
  'additionalProperties': false,
  'properties': faultConfigSchema.properties,
  'required': [],
  'type': 'object'
} as const;
const partialFaultConfigNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'cause': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'component': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'context': anyObjectNode,
    'durationMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'operation': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'stack': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'status': LogStatusEntity.Node
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
const faultConfigWithoutIdentitySchema = {
  'additionalProperties': false,
  'properties': {
    'cause': { 'minLength': 1, 'type': 'string' },
    'component': { 'minLength': 1, 'type': 'string' },
    'context': anyObjectSchema,
    'durationMs': { 'minimum': 0, 'type': 'integer' },
    'operation': { 'minLength': 1, 'type': 'string' },
    'stack': { 'minLength': 1, 'type': 'string' },
    'status': logStatusEnumSchema
  },
  'required': ['component', 'context', 'operation', 'status'],
  'type': 'object'
} as const;
const faultConfigWithoutIdentityNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'cause': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'component': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'context': anyObjectNode,
    'durationMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'operation': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'stack': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'status': LogStatusEntity.Node
  }, ['component', 'context', 'operation', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const emptyInputSchema = { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' } as const;
const emptyInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Case shapes exercised by `logger-primitive-contracts.loop.spec.ts`, discriminated by `shape`. */
export namespace LoggerPrimitiveContractsScenarioCaseEntity {
  const levelValuesSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': { 'additionalProperties': false, 'properties': { 'values': numberLevelsSchema }, 'required': ['values'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'values': numberLevelsSchema }, 'required': ['values'], 'type': 'object' }, 'name': nameSchema, 'shape': { 'const': 'level-values' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const levelValuesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': numberLevelsNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': numberLevelsNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'level-values' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const levelOrderSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': { 'additionalProperties': false, 'properties': { 'ordered': { 'const': true } }, 'required': ['ordered'], 'type': 'object' },
      'input': { 'additionalProperties': false, 'properties': { 'ordered': { 'const': true } }, 'required': ['ordered'], 'type': 'object' },
      'name': nameSchema,
      'shape': { 'const': 'level-order' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const levelOrderNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'ordered': SchemaNode.defineConst({}, true as const) }, ['ordered'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'ordered': SchemaNode.defineConst({}, true as const) }, ['ordered'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'level-order' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const levelMapSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': { 'additionalProperties': false, 'properties': { 'resolved': lowercaseLevelsSchema }, 'required': ['resolved'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'resolved': lowercaseLevelsSchema }, 'required': ['resolved'], 'type': 'object' }, 'name': nameSchema, 'shape': { 'const': 'level-map' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const levelMapNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'resolved': lowercaseLevelsNode }, ['resolved'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'resolved': lowercaseLevelsNode }, ['resolved'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'level-map' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const numericArraySchema = { 'items': { 'type': 'integer' }, 'type': 'array' } as const;
  const numericArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'integer' } as const), undefined);
  const parseNumericSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': { 'additionalProperties': false, 'properties': { 'values': numericArraySchema }, 'required': ['values'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'values': numericArraySchema }, 'required': ['values'], 'type': 'object' }, 'name': nameSchema, 'shape': { 'const': 'parse-numeric' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const parseNumericNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': numericArrayNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': numericArrayNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'parse-numeric' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const parseStringSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': { 'additionalProperties': false, 'properties': { 'values': lowercaseLevelsSchema }, 'required': ['values'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'values': lowercaseLevelsSchema }, 'required': ['values'], 'type': 'object' }, 'name': nameSchema, 'shape': { 'const': 'parse-string' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const parseStringNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': lowercaseLevelsNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': lowercaseLevelsNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'parse-string' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const parseInvalidStringSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': { 'additionalProperties': false, 'properties': { 'values': invalidStringLevelsSchema }, 'required': ['values'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'values': invalidStringLevelsSchema }, 'required': ['values'], 'type': 'object' }, 'name': nameSchema, 'shape': { 'const': 'parse-invalid-string' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const parseInvalidStringNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': invalidStringLevelsNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': invalidStringLevelsNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'parse-invalid-string' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const stringArraySchema = { 'items': { 'type': 'string' }, 'type': 'array' } as const;
  const stringArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined);
  const safeStringifyBasicSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': { 'additionalProperties': false, 'properties': { 'outputs': stringArraySchema }, 'required': ['outputs'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'outputs': stringArraySchema }, 'required': ['outputs'], 'type': 'object' }, 'name': nameSchema, 'shape': { 'const': 'safe-stringify-basic' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const safeStringifyBasicNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'outputs': stringArrayNode }, ['outputs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'outputs': stringArrayNode }, ['outputs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'safe-stringify-basic' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const containsPairSchema = {
    'additionalProperties': false,
    'properties': { 'result1Contains': stringArraySchema, 'result2Contains': stringArraySchema },
    'required': ['result1Contains', 'result2Contains'],
    'type': 'object'
  } as const;
  const containsPairNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'result1Contains': stringArrayNode, 'result2Contains': stringArrayNode }, ['result1Contains', 'result2Contains'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const safeStringifyCircularSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': containsPairSchema, 'input': containsPairSchema, 'name': nameSchema, 'shape': { 'const': 'safe-stringify-circular' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const safeStringifyCircularNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'expected': containsPairNode, 'input': containsPairNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'safe-stringify-circular' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const parsedTypesSchema = {
    'additionalProperties': false,
    'properties': {
      'array': numericArraySchema,
      'boolean': { 'type': 'boolean' },
      'nested': { 'additionalProperties': false, 'properties': { 'key': { 'minLength': 1, 'type': 'string' } }, 'required': ['key'], 'type': 'object' },
      'nullValue': { 'type': 'null' },
      'number': { 'type': 'integer' },
      'string': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['array', 'boolean', 'nested', 'nullValue', 'number', 'string'],
    'type': 'object'
  } as const;
  const parsedTypesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'array': numericArrayNode,
      'boolean': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'nested': SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'nullValue': SchemaNode.defineNull({ 'type': 'null' } as const),
      'number': SchemaNode.defineNumber({ 'type': 'integer' } as const),
      'string': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['array', 'boolean', 'nested', 'nullValue', 'number', 'string'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const containsAndParsedSchema = {
    'additionalProperties': false,
    'properties': { 'contains': stringArraySchema, 'parsed': parsedTypesSchema },
    'required': ['contains', 'parsed'],
    'type': 'object'
  } as const;
  const containsAndParsedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'contains': stringArrayNode, 'parsed': parsedTypesNode }, ['contains', 'parsed'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const safeStringifyTypesSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': containsAndParsedSchema, 'input': containsAndParsedSchema, 'name': nameSchema, 'shape': { 'const': 'safe-stringify-types' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const safeStringifyTypesNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'expected': containsAndParsedNode, 'input': containsAndParsedNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'safe-stringify-types' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const primitivesSchema = {
    'additionalProperties': false,
    'properties': { 'boolean': { 'minLength': 1, 'type': 'string' }, 'null': { 'minLength': 1, 'type': 'string' }, 'number': { 'minLength': 1, 'type': 'string' }, 'string': { 'minLength': 1, 'type': 'string' } },
    'required': ['boolean', 'null', 'number', 'string'],
    'type': 'object'
  } as const;
  const primitivesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'boolean': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'null': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'number': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'string': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['boolean', 'null', 'number', 'string'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const safeStringifyJsonEdgesSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': {
        'additionalProperties': false,
        'properties': {
          'dateContains': { 'minLength': 1, 'type': 'string' },
          'emptyArray': { 'minLength': 1, 'type': 'string' },
          'emptyObject': { 'minLength': 1, 'type': 'string' },
          'primitives': primitivesSchema,
          'symbolObject': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['dateContains', 'emptyArray', 'emptyObject', 'primitives', 'symbolObject'],
        'type': 'object'
      },
      'input': emptyInputSchema,
      'name': nameSchema,
      'shape': { 'const': 'safe-stringify-json-edges' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const safeStringifyJsonEdgesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'dateContains': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'emptyArray': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'emptyObject': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'primitives': primitivesNode,
          'symbolObject': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['dateContains', 'emptyArray', 'emptyObject', 'primitives', 'symbolObject'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': emptyInputNode,
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'safe-stringify-json-edges' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const entityCompositionFlagsSchema = {
    'additionalProperties': false,
    'properties': {
      'cloudwatchValid': { 'const': true },
      'hookShapeInvalid': { 'const': false },
      'hookShapeValid': { 'const': true },
      'logDataInvalid': { 'const': false },
      'logDataValid': { 'const': true }
    },
    'required': ['cloudwatchValid', 'hookShapeInvalid', 'hookShapeValid', 'logDataInvalid', 'logDataValid'],
    'type': 'object'
  } as const;
  const entityCompositionFlagsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'cloudwatchValid': SchemaNode.defineConst({}, true as const),
      'hookShapeInvalid': SchemaNode.defineConst({}, false as const),
      'hookShapeValid': SchemaNode.defineConst({}, true as const),
      'logDataInvalid': SchemaNode.defineConst({}, false as const),
      'logDataValid': SchemaNode.defineConst({}, true as const)
    }, ['cloudwatchValid', 'hookShapeInvalid', 'hookShapeValid', 'logDataInvalid', 'logDataValid'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const entityCompositionSchema = {
    'additionalProperties': false,
    'properties': { 'description': nameSchema, 'expected': entityCompositionFlagsSchema, 'input': entityCompositionFlagsSchema, 'name': nameSchema, 'shape': { 'const': 'entity-composition' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const entityCompositionNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': nameNode, 'expected': entityCompositionFlagsNode, 'input': entityCompositionFlagsNode, 'name': nameNode, 'shape': SchemaNode.defineConst({}, 'entity-composition' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const logFaultBasicSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': {
        'additionalProperties': false,
        'properties': {
          'event': { 'minLength': 1, 'type': 'string' },
          'frozen': { 'const': true },
          'message': { 'minLength': 1, 'type': 'string' },
          'name': { 'minLength': 1, 'type': 'string' },
          'nestedAttempt': { 'type': 'integer' },
          'status': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['event', 'frozen', 'message', 'name', 'nestedAttempt', 'status'],
        'type': 'object'
      },
      'input': { 'additionalProperties': false, 'properties': { 'fault': faultConfigSchema }, 'required': ['fault'], 'type': 'object' },
      'name': nameSchema,
      'shape': { 'const': 'log-fault-basic' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const logFaultBasicNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'event': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'frozen': SchemaNode.defineConst({}, true as const),
          'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'nestedAttempt': SchemaNode.defineNumber({ 'type': 'integer' } as const),
          'status': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['event', 'frozen', 'message', 'name', 'nestedAttempt', 'status'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fault': faultConfigNode }, ['fault'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'log-fault-basic' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const logFaultOptionalFieldsSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': {
        'additionalProperties': false,
        'properties': { 'cause': { 'minLength': 1, 'type': 'string' }, 'durationMs': { 'minimum': 0, 'type': 'integer' }, 'stack': { 'minLength': 1, 'type': 'string' } },
        'required': ['cause', 'durationMs', 'stack'],
        'type': 'object'
      },
      'input': { 'additionalProperties': false, 'properties': { 'fault': faultConfigSchema }, 'required': ['fault'], 'type': 'object' },
      'name': nameSchema,
      'shape': { 'const': 'log-fault-optional-fields' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const logFaultOptionalFieldsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'cause': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'durationMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
          'stack': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['cause', 'durationMs', 'stack'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fault': faultConfigNode }, ['fault'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'log-fault-optional-fields' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const logFaultMissingFieldSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': {
        'additionalProperties': false,
        'properties': { 'message': { 'minLength': 1, 'type': 'string' }, 'name': { 'const': 'LogBuildError' } },
        'required': ['message', 'name'],
        'type': 'object'
      },
      'input': { 'additionalProperties': false, 'properties': { 'fault': partialFaultConfigSchema }, 'required': ['fault'], 'type': 'object' },
      'name': nameSchema,
      'shape': { 'const': 'log-fault-missing-field' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const logFaultMissingFieldNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'name': SchemaNode.defineConst({}, 'LogBuildError' as const) }, ['message', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fault': partialFaultConfigNode }, ['fault'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'log-fault-missing-field' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const logFaultFromErrorFieldsSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': {
        'additionalProperties': false,
        'properties': {
          'cause': { 'minLength': 1, 'type': 'string' },
          'event': { 'minLength': 1, 'type': 'string' },
          'message': { 'minLength': 1, 'type': 'string' },
          'name': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['cause', 'event', 'message', 'name'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'error': {
            'additionalProperties': false,
            'properties': { 'cause': { 'minLength': 1, 'type': 'string' }, 'message': { 'minLength': 1, 'type': 'string' }, 'name': { 'minLength': 1, 'type': 'string' } },
            'required': ['cause', 'message', 'name'],
            'type': 'object'
          },
          'fault': faultConfigWithoutIdentitySchema
        },
        'required': ['error', 'fault'],
        'type': 'object'
      },
      'name': nameSchema,
      'shape': { 'const': 'log-fault-from-error-fields' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const logFaultFromErrorFieldsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'cause': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'event': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['cause', 'event', 'message', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'error': SchemaNode.defineObject({ 'type': 'object' } as const, {
              'cause': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
              'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
              'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
            }, ['cause', 'message', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'fault': faultConfigWithoutIdentityNode
        }, ['error', 'fault'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'log-fault-from-error-fields' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const consoleMethodSchema = { 'enum': CONSOLE_METHODS } as const;
  const consoleMethodNode = SchemaNode.defineEnum({}, CONSOLE_METHODS);
  const consoleCallsSchema = {
    'additionalProperties': false,
    'properties': { 'debug': stringArraySchema, 'error': stringArraySchema, 'info': stringArraySchema, 'trace': stringArraySchema, 'warn': stringArraySchema },
    'required': ['debug', 'error', 'info', 'trace', 'warn'],
    'type': 'object'
  } as const;
  const consoleCallsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'debug': stringArrayNode, 'error': stringArrayNode, 'info': stringArrayNode, 'trace': stringArrayNode, 'warn': stringArrayNode }, ['debug', 'error', 'info', 'trace', 'warn'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const consoleBodySchema = {
    'additionalProperties': false,
    'properties': {
      'component': { 'minLength': 1, 'type': 'string' },
      'context': anyObjectSchema,
      'operation': { 'minLength': 1, 'type': 'string' },
      'status': logStatusEnumSchema,
      'time': { 'type': 'integer' }
    },
    'required': ['component', 'context', 'operation', 'status', 'time'],
    'type': 'object'
  } as const;
  const consoleBodyNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'component': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'context': anyObjectNode,
      'operation': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'status': LogStatusEntity.Node,
      'time': SchemaNode.defineNumber({ 'type': 'integer' } as const)
    }, ['component', 'context', 'operation', 'status', 'time'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const consoleRecordSchema = {
    'additionalProperties': false,
    'properties': { 'level': logLevelEnumSchema, 'message': { 'minLength': 1, 'type': 'string' }, 'metadata': anyObjectSchema, 'method': consoleMethodSchema },
    'required': ['level', 'message', 'metadata', 'method'],
    'type': 'object'
  } as const;
  const consoleRecordNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'level': LogLevelEntity.Node, 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'metadata': anyObjectNode, 'method': consoleMethodNode }, ['level', 'message', 'metadata', 'method'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const consoleTransportDispatchSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': { 'additionalProperties': false, 'properties': { 'calls': consoleCallsSchema }, 'required': ['calls'], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'body': consoleBodySchema,
          'records': { 'items': consoleRecordSchema, 'type': 'array' },
          'transport': {
            'additionalProperties': false,
            'properties': {
              'filtered': {
                'additionalProperties': false,
                'properties': { 'level': logLevelEnumSchema, 'message': { 'minLength': 1, 'type': 'string' }, 'minLevel': logLevelEnumSchema },
                'required': ['level', 'message', 'minLevel'],
                'type': 'object'
              },
              'level': logLevelEnumSchema
            },
            'required': ['filtered', 'level'],
            'type': 'object'
          }
        },
        'required': ['body', 'records', 'transport'],
        'type': 'object'
      },
      'name': nameSchema,
      'shape': { 'const': 'console-transport-dispatch' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const consoleTransportDispatchNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'calls': consoleCallsNode }, ['calls'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'body': consoleBodyNode,
          'records': SchemaNode.defineArray({ 'type': 'array' } as const, consoleRecordNode, undefined),
          'transport': SchemaNode.defineObject({ 'type': 'object' } as const, {
              'filtered': SchemaNode.defineObject({ 'type': 'object' } as const, { 'level': LogLevelEntity.Node, 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'minLevel': LogLevelEntity.Node }, ['level', 'message', 'minLevel'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
              'level': LogLevelEntity.Node
            }, ['filtered', 'level'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['body', 'records', 'transport'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'console-transport-dispatch' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const consoleTransportInvalidLevelSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': {
        'additionalProperties': false,
        'properties': { 'message': { 'minLength': 1, 'type': 'string' }, 'name': { 'const': 'ConfigurationError' } },
        'required': ['message', 'name'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'transport': { 'additionalProperties': false, 'properties': { 'level': emptyInputSchema }, 'required': ['level'], 'type': 'object' } },
        'required': ['transport'],
        'type': 'object'
      },
      'name': nameSchema,
      'shape': { 'const': 'console-transport-invalid-level' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const consoleTransportInvalidLevelNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'name': SchemaNode.defineConst({}, 'ConfigurationError' as const) }, ['message', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'transport': SchemaNode.defineObject({ 'type': 'object' } as const, { 'level': emptyInputNode }, ['level'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['transport'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'console-transport-invalid-level' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const constructorEntrySchema = {
    'additionalProperties': false,
    'properties': { 'message': { 'minLength': 1, 'type': 'string' }, 'name': { 'minLength': 1, 'type': 'string' }, 'withCause': { 'type': 'boolean' } },
    'required': ['message', 'name', 'withCause'],
    'type': 'object'
  } as const;
  const constructorEntryNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'withCause': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['message', 'name', 'withCause'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const errorConstructorsSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': {
        'additionalProperties': false,
        'properties': { 'code': { 'minLength': 1, 'type': 'string' }, 'constructors': { 'items': constructorEntrySchema, 'type': 'array' } },
        'required': ['code', 'constructors'],
        'type': 'object'
      },
      'input': emptyInputSchema,
      'name': nameSchema,
      'shape': { 'const': 'error-constructors' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const errorConstructorsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'constructors': SchemaNode.defineArray({ 'type': 'array' } as const, constructorEntryNode, undefined) }, ['code', 'constructors'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': emptyInputNode,
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'error-constructors' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      levelValuesSchema, levelOrderSchema, levelMapSchema, parseNumericSchema, parseStringSchema, parseInvalidStringSchema,
      safeStringifyBasicSchema, safeStringifyCircularSchema, safeStringifyTypesSchema, safeStringifyJsonEdgesSchema,
      entityCompositionSchema, logFaultBasicSchema, logFaultOptionalFieldsSchema, logFaultMissingFieldSchema,
      logFaultFromErrorFieldsSchema, consoleTransportDispatchSchema, consoleTransportInvalidLevelSchema, errorConstructorsSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    levelValuesNode, levelOrderNode, levelMapNode, parseNumericNode, parseStringNode, parseInvalidStringNode,
    safeStringifyBasicNode, safeStringifyCircularNode, safeStringifyTypesNode, safeStringifyJsonEdgesNode,
    entityCompositionNode, logFaultBasicNode, logFaultOptionalFieldsNode, logFaultMissingFieldNode,
    logFaultFromErrorFieldsNode, consoleTransportDispatchNode, consoleTransportInvalidLevelNode, errorConstructorsNode
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
