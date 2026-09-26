import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SCENARIO_SHAPES = [
  'audit-instanceof',
  'audit-json-base',
  'audit-json-extra',
  'audit-json-independent',
  'audit-name',
  'audit-user-message',
  'network-cause-chain',
  'network-find-cause',
  'network-has-cause',
  'network-instanceof',
  'network-json-context',
  'network-json-name',
  'network-json-status-code',
  'network-name'
] as const;

const contextSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
const contextNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true });

/** The scenario case shape `subclass-extension.loop.spec.ts` exercises across a `BaseError`/`ModuleError` subclass's own contract. */
export namespace SubclassExtensionScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'auditId': { 'type': 'string' },
          'baseError': { 'type': 'boolean' },
          'chainLength': { 'type': 'number' },
          'code': { 'type': 'string' },
          'context': contextSchema,
          'error': { 'type': 'boolean' },
          'found': { 'type': 'boolean' },
          'instanceOf': { 'type': 'boolean' },
          'jsonHasAuditId': { 'type': 'boolean' },
          'message': { 'type': 'string' },
          'messagePrefix': { 'type': 'string' },
          'moduleError': { 'type': 'boolean' },
          'name': { 'type': 'string' },
          'networkModuleError': { 'type': 'boolean' },
          'policy': { 'type': 'string' },
          'runtimeError': { 'type': 'boolean' },
          'status': { 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'auditId': { 'type': 'string' },
          'causeMessage': { 'type': 'string' },
          'context': contextSchema,
          'message': { 'type': 'string' },
          'policy': { 'type': 'string' }
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

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'auditId': SchemaNode.defineString({ 'type': 'string' } as const),
          'baseError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'chainLength': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'code': SchemaNode.defineString({ 'type': 'string' } as const),
          'context': contextNode,
          'error': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'found': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'instanceOf': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'jsonHasAuditId': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'messagePrefix': SchemaNode.defineString({ 'type': 'string' } as const),
          'moduleError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'name': SchemaNode.defineString({ 'type': 'string' } as const),
          'networkModuleError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'policy': SchemaNode.defineString({ 'type': 'string' } as const),
          'runtimeError': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'status': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'auditId': SchemaNode.defineString({ 'type': 'string' } as const),
          'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'context': contextNode,
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'policy': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(SCENARIO_SHAPES)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
