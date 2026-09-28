import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const ERROR_DEFAULT_SCENARIOS = [
  'AUTHENTICATION',
  'AUTHORIZATION',
  'CONFIGURATION',
  'CONNECTION',
  'DATABASE',
  'EXTERNAL_SERVICE',
  'INTERNAL',
  'NOT_FOUND',
  'RATE_LIMIT',
  'TIMEOUT',
  'VALIDATION'
] as const;

const SCENARIO_SHAPES = [
  'defaults',
  'error-code-values',
  'http-status-client',
  'http-status-server',
  'integration-cause-override',
  'integration-context-override',
  'integration-retryable-override',
  'integration-status-code-override',
  'module-error-authentication',
  'retryable'
] as const;

/**
 * The scenario case shape `constants.loop.spec.ts` exercises across error-code/HTTP-status
 * constant snapshots and ModuleError construction. `error-code-values`/`http-status-client`/
 * `http-status-server` compare `input` to `expected` directly as full enum-name snapshots, so
 * both share one open dictionary shape; the ModuleError-construction shapes (`defaults`,
 * `retryable`, `module-error-authentication`, `integration-*`) share a nested `error` input.
 */
export namespace ConstantsScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': { 'oneOf': [{ 'type': 'string' }, { 'type': 'number' }, { 'type': 'boolean' }, { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' }] },
        'properties': {},
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': { 'oneOf': [{ 'type': 'string' }, { 'type': 'number' }] },
        'properties': {
          'error': {
            'additionalProperties': false,
            'properties': {
              'causeMessage': { 'type': 'string' },
              'message': { 'type': 'string' },
              'options': {
                'additionalProperties': false,
                'properties': {
                  'context': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' },
                  'retryable': { 'type': 'boolean' },
                  'scenario': { 'enum': ERROR_DEFAULT_SCENARIOS },
                  'status': { 'type': 'number' }
                },
                'required': ['scenario'],
                'type': 'object'
              }
            },
            'required': ['message', 'options'],
            'type': 'object'
          },
          'scenario': { 'enum': ERROR_DEFAULT_SCENARIOS }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineOneOf({}, [SchemaNode.defineString({ 'type': 'string' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineBoolean({ 'type': 'boolean' } as const), SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} })]), 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'error': SchemaNode.defineObject({ 'type': 'object' } as const, {
              'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
              'message': SchemaNode.defineString({ 'type': 'string' } as const),
              'options': SchemaNode.defineObject({ 'type': 'object' } as const, {
                  'context': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }),
                  'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
                  'scenario': SchemaNode.defineEnum({}, ERROR_DEFAULT_SCENARIOS),
                  'status': SchemaNode.defineNumber({ 'type': 'number' } as const)
                }, ['scenario'] as const, { 'additionalProperties': false, 'patternProperties': {} })
            }, ['message', 'options'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'scenario': SchemaNode.defineEnum({}, ERROR_DEFAULT_SCENARIOS)
        }, [] as const, { 'additionalProperties': SchemaNode.defineOneOf({}, [SchemaNode.defineString({ 'type': 'string' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const)]), 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SCENARIO_SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
