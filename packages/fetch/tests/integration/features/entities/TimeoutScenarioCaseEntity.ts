import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `timeout.loop.spec.ts` scenario case shape: one `oneOf` branch per `shape`. */
export namespace TimeoutScenarioCaseEntity {
  const caseFields = { 'description': { 'minLength': 1, 'type': 'string' }, 'name': { 'minLength': 1, 'type': 'string' } } as const;
  const caseNodeFields = {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  };
  const statusExpectedSchema = { 'additionalProperties': false, 'properties': { 'status': { 'maximum': 599, 'minimum': 100, 'type': 'integer' } }, 'required': ['status'], 'type': 'object' } as const;
  const StatusExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'status': SchemaNode.defineNumber({ 'maximum': 599, 'minimum': 100, 'type': 'integer' } as const) }, ['status'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const timeoutErrorExpectedSchema = { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'TimeoutError' } }, 'required': ['errorName'], 'type': 'object' } as const;
  const TimeoutErrorExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'TimeoutError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const requestWithOptionalTimeoutSchema = {
    'additionalProperties': false,
    'properties': { 'timeout': { 'exclusiveMinimum': 0, 'type': 'integer' }, 'url': { 'minLength': 1, 'type': 'string' } },
    'required': ['url'],
    'type': 'object'
  } as const;
  const RequestWithOptionalTimeoutNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const), 'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['url'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  const requestWithTimeoutSchema = {
    'additionalProperties': false,
    'properties': { 'timeout': { 'exclusiveMinimum': 0, 'type': 'integer' }, 'url': { 'minLength': 1, 'type': 'string' } },
    'required': ['timeout', 'url'],
    'type': 'object'
  } as const;
  const RequestWithTimeoutNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const), 'url': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['timeout', 'url'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const completesWithoutTimeoutSchema = {
    'additionalProperties': false,
    'properties': { ...caseFields, 'expected': statusExpectedSchema, 'input': { 'additionalProperties': false, 'properties': { 'request': requestWithOptionalTimeoutSchema }, 'required': ['request'], 'type': 'object' }, 'shape': { 'const': 'completes-without-timeout' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const CompletesWithoutTimeoutNode = SchemaNode.defineObject({ 'type': 'object' } as const, { ...caseNodeFields, 'expected': StatusExpectedNode, 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'request': RequestWithOptionalTimeoutNode }, ['request'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'shape': SchemaNode.defineConst({}, 'completes-without-timeout' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  class TimeoutScenarioCaseEntityBuilders {
    static timeoutErrorBranch<TShape extends string>(shape: TShape) {
      const result = {
        'additionalProperties': false,
        'properties': { ...caseFields, 'expected': timeoutErrorExpectedSchema, 'input': { 'additionalProperties': false, 'properties': { 'request': requestWithTimeoutSchema }, 'required': ['request'], 'type': 'object' }, 'shape': { 'const': shape } },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      } as const;
      return result;
    }

    static timeoutErrorBranchNode<TShape extends string>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, { ...caseNodeFields, 'expected': TimeoutErrorExpectedNode, 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'request': RequestWithTimeoutNode }, ['request'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'shape': SchemaNode.defineConst({}, shape) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }

    static statusWithTimeoutBranch<TShape extends string>(shape: TShape) {
      const result = {
        'additionalProperties': false,
        'properties': { ...caseFields, 'expected': statusExpectedSchema, 'input': { 'additionalProperties': false, 'properties': { 'request': requestWithTimeoutSchema }, 'required': ['request'], 'type': 'object' }, 'shape': { 'const': shape } },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      } as const;
      return result;
    }

    static statusWithTimeoutBranchNode<TShape extends string>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, { ...caseNodeFields, 'expected': StatusExpectedNode, 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'request': RequestWithTimeoutNode }, ['request'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'shape': SchemaNode.defineConst({}, shape) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }
  }

  const reportsTimeoutDetailsSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': {
        'additionalProperties': false,
        'properties': { 'errorName': { 'const': 'TimeoutError' }, 'timeoutMs': { 'exclusiveMinimum': 0, 'type': 'integer' }, 'urlIncludes': { 'minLength': 1, 'type': 'string' } },
        'required': ['errorName', 'timeoutMs', 'urlIncludes'],
        'type': 'object'
      },
      'input': { 'additionalProperties': false, 'properties': { 'request': requestWithTimeoutSchema }, 'required': ['request'], 'type': 'object' },
      'shape': { 'const': 'reports-timeout-details' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const ReportsTimeoutDetailsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'TimeoutError' as const), 'timeoutMs': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const), 'urlIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['errorName', 'timeoutMs', 'urlIncludes'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'request': RequestWithTimeoutNode }, ['request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'reports-timeout-details' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const appliesDefaultTimeoutSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': statusExpectedSchema,
      'input': { 'additionalProperties': false, 'properties': { 'clientTimeout': { 'exclusiveMinimum': 0, 'type': 'integer' }, 'request': requestWithOptionalTimeoutSchema }, 'required': ['clientTimeout', 'request'], 'type': 'object' },
      'shape': { 'const': 'applies-default-timeout' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const AppliesDefaultTimeoutNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': StatusExpectedNode,
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'clientTimeout': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const), 'request': RequestWithOptionalTimeoutNode }, ['clientTimeout', 'request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'applies-default-timeout' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const requestOverridesDefaultTimeoutSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': statusExpectedSchema,
      'input': { 'additionalProperties': false, 'properties': { 'clientTimeout': { 'exclusiveMinimum': 0, 'type': 'integer' }, 'request': requestWithTimeoutSchema }, 'required': ['clientTimeout', 'request'], 'type': 'object' },
      'shape': { 'const': 'request-overrides-default-timeout' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const RequestOverridesDefaultTimeoutNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': StatusExpectedNode,
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'clientTimeout': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const), 'request': RequestWithTimeoutNode }, ['clientTimeout', 'request'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'request-overrides-default-timeout' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      completesWithoutTimeoutSchema,
      TimeoutScenarioCaseEntityBuilders.timeoutErrorBranch('times-out-fast-request'),
      reportsTimeoutDetailsSchema,
      TimeoutScenarioCaseEntityBuilders.statusWithTimeoutBranch('clears-timeout-after-success'),
      TimeoutScenarioCaseEntityBuilders.timeoutErrorBranch('supports-timeout-in-get'),
      TimeoutScenarioCaseEntityBuilders.statusWithTimeoutBranch('works-with-fast-requests'),
      appliesDefaultTimeoutSchema,
      requestOverridesDefaultTimeoutSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    CompletesWithoutTimeoutNode,
    TimeoutScenarioCaseEntityBuilders.timeoutErrorBranchNode('times-out-fast-request'),
    ReportsTimeoutDetailsNode,
    TimeoutScenarioCaseEntityBuilders.statusWithTimeoutBranchNode('clears-timeout-after-success'),
    TimeoutScenarioCaseEntityBuilders.timeoutErrorBranchNode('supports-timeout-in-get'),
    TimeoutScenarioCaseEntityBuilders.statusWithTimeoutBranchNode('works-with-fast-requests'),
    AppliesDefaultTimeoutNode,
    RequestOverridesDefaultTimeoutNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
