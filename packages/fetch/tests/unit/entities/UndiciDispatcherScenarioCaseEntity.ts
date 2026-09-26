import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SocketDispatcherStatsEntity } from '../../../src/entities/SocketDispatcherStatsEntity.js';
import { BoundedJsonValueEntity } from '../../helpers/entities/BoundedJsonValueEntity.js';

/**
 * The `undici-dispatcher.loop.spec.ts` scenario case shape: one `oneOf` branch per `shape`, mirroring
 * the file's original hand-written union so `Extract<ScenarioCase, {shape: ...}>` still narrows.
 * `input.agent` for `constructor-invalid-agent` is deliberately loose — it feeds intentionally
 * malformed data to prove `UndiciDispatcher.create` rejects it.
 */
export namespace UndiciDispatcherScenarioCaseEntity {
  const testDispatcherSchema = {
    'additionalProperties': false,
    'properties': { 'connections': { 'minimum': 1, 'type': 'integer' }, 'enabled': { 'type': 'boolean' } },
    'required': [],
    'type': 'object'
  } as const;
  const TestDispatcherNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'connections': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
    [] as const,
    { 'additionalProperties': false }
  );

  const statsBagSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const StatsBagNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node });

  const connectionStatsSchema = SocketDispatcherStatsEntity.Schema;
  const ConnectionStatsNode = SocketDispatcherStatsEntity.Node;

  const agentOptionsSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const AgentOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node });

  const originField = { 'minLength': 1, 'type': 'string' } as const;
  const OriginNode = SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const);
  const caseFields = { 'description': { 'minLength': 1, 'type': 'string' }, 'name': { 'minLength': 1, 'type': 'string' } } as const;
  const caseNodeFields = {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  };

  const constructorInvalidAgentSchema = {
    'additionalProperties': false,
    'properties': { ...caseFields, 'expected': { 'additionalProperties': false, 'properties': { 'message': { 'type': 'string' }, 'shape': { 'const': 'throws' } }, 'required': ['message', 'shape'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'agent': BoundedJsonValueEntity.Schema }, 'required': ['agent'], 'type': 'object' }, 'shape': { 'const': 'constructor-invalid-agent' } },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const ConstructorInvalidAgentNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'type': 'string' } as const), 'shape': SchemaNode.defineConst('throws' as const) }, ['message', 'shape'] as const, { 'additionalProperties': false }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'agent': BoundedJsonValueEntity.Node }, ['agent'] as const, { 'additionalProperties': false }),
      'shape': SchemaNode.defineConst('constructor-invalid-agent' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  function healthyStatsBranch<TShape extends 'health-invalid-stats' | 'health-no-stats'>(shape: TShape) {
    return {
      'additionalProperties': false,
      'properties': { ...caseFields, 'expected': { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'healthy' } }, 'required': ['shape'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'origin': originField, 'stats': statsBagSchema }, 'required': ['origin'], 'type': 'object' }, 'shape': { 'const': shape } },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function healthyStatsBranchNode<TShape extends 'health-invalid-stats' | 'health-no-stats'>(shape: TShape) {
    return SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('healthy' as const) }, ['shape'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'origin': OriginNode, 'stats': StatsBagNode }, ['origin'] as const, { 'additionalProperties': false }),
        'shape': SchemaNode.defineConst(shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    );
  }

  function healthBranch<TShape extends 'health-ok' | 'health-overload' | 'health-pressure'>(shape: TShape) {
    return {
      'additionalProperties': false,
      'properties': {
        ...caseFields,
        'expected': {
          'additionalProperties': false,
          'properties': { 'healthy': { 'type': 'boolean' }, 'recommendationIncludes': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'health' } },
          'required': ['healthy', 'shape'],
          'type': 'object'
        },
        'input': { 'additionalProperties': false, 'properties': { 'origin': originField, 'stats': connectionStatsSchema }, 'required': ['origin', 'stats'], 'type': 'object' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function healthBranchNode<TShape extends 'health-ok' | 'health-overload' | 'health-pressure'>(shape: TShape) {
    return SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'healthy': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'recommendationIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'shape': SchemaNode.defineConst('health' as const)
          },
          ['healthy', 'shape'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'origin': OriginNode, 'stats': ConnectionStatsNode }, ['origin', 'stats'] as const, { 'additionalProperties': false }),
        'shape': SchemaNode.defineConst(shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    );
  }

  const getStatsFreezeSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'frozen' } }, 'required': ['shape'], 'type': 'object' },
      'input': { 'additionalProperties': false, 'properties': { 'origin': originField, 'stats': { 'additionalProperties': connectionStatsSchema, 'properties': {}, 'required': [], 'type': 'object' } }, 'required': ['origin', 'stats'], 'type': 'object' },
      'shape': { 'const': 'get-stats-freeze' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const GetStatsFreezeNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('frozen' as const) }, ['shape'] as const, { 'additionalProperties': false }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'origin': OriginNode, 'stats': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': ConnectionStatsNode }) }, ['origin', 'stats'] as const, { 'additionalProperties': false }),
      'shape': SchemaNode.defineConst('get-stats-freeze' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  function agentOperationBranch<TShape extends 'close-agent' | 'destroy-agent' | 'destroy-agent-delay' | 'destroy-agent-zero'>(shape: TShape) {
    return {
      'additionalProperties': false,
      'properties': {
        ...caseFields,
        'expected': { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'called' } }, 'required': ['shape'], 'type': 'object' },
        'input': { 'additionalProperties': false, 'properties': { 'agent': agentOptionsSchema, 'timeout': { 'type': 'integer' } }, 'required': [], 'type': 'object' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function agentOperationBranchNode<TShape extends 'close-agent' | 'destroy-agent' | 'destroy-agent-delay' | 'destroy-agent-zero'>(shape: TShape) {
    return SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('called' as const) }, ['shape'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'agent': AgentOptionsNode, 'timeout': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, [] as const, { 'additionalProperties': false }),
        'shape': SchemaNode.defineConst(shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    );
  }

  const testDispatcherHealthSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'healthy' } }, 'required': ['shape'], 'type': 'object' },
      'input': { 'additionalProperties': false, 'properties': { 'origin': originField, 'testDispatcher': testDispatcherSchema }, 'required': ['origin', 'testDispatcher'], 'type': 'object' },
      'shape': { 'const': 'test-dispatcher-health' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const TestDispatcherHealthNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('healthy' as const) }, ['shape'] as const, { 'additionalProperties': false }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'origin': OriginNode, 'testDispatcher': TestDispatcherNode }, ['origin', 'testDispatcher'] as const, { 'additionalProperties': false }),
      'shape': SchemaNode.defineConst('test-dispatcher-health' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  function testDispatcherCalledBranch<TShape extends 'test-dispatcher-close' | 'test-dispatcher-destroy'>(shape: TShape) {
    return {
      'additionalProperties': false,
      'properties': {
        ...caseFields,
        'expected': { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'called' } }, 'required': ['shape'], 'type': 'object' },
        'input': { 'additionalProperties': false, 'properties': { 'testDispatcher': testDispatcherSchema }, 'required': ['testDispatcher'], 'type': 'object' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function testDispatcherCalledBranchNode<TShape extends 'test-dispatcher-close' | 'test-dispatcher-destroy'>(shape: TShape) {
    return SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst('called' as const) }, ['shape'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'testDispatcher': TestDispatcherNode }, ['testDispatcher'] as const, { 'additionalProperties': false }),
        'shape': SchemaNode.defineConst(shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    );
  }

  export const Schema = {
    'oneOf': [
      constructorInvalidAgentSchema,
      healthyStatsBranch('health-no-stats'),
      healthyStatsBranch('health-invalid-stats'),
      healthBranch('health-pressure'),
      healthBranch('health-overload'),
      healthBranch('health-ok'),
      getStatsFreezeSchema,
      agentOperationBranch('close-agent'),
      agentOperationBranch('destroy-agent'),
      agentOperationBranch('destroy-agent-delay'),
      agentOperationBranch('destroy-agent-zero'),
      testDispatcherHealthSchema,
      testDispatcherCalledBranch('test-dispatcher-close'),
      testDispatcherCalledBranch('test-dispatcher-destroy')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    ConstructorInvalidAgentNode,
    healthyStatsBranchNode('health-no-stats'),
    healthyStatsBranchNode('health-invalid-stats'),
    healthBranchNode('health-pressure'),
    healthBranchNode('health-overload'),
    healthBranchNode('health-ok'),
    GetStatsFreezeNode,
    agentOperationBranchNode('close-agent'),
    agentOperationBranchNode('destroy-agent'),
    agentOperationBranchNode('destroy-agent-delay'),
    agentOperationBranchNode('destroy-agent-zero'),
    TestDispatcherHealthNode,
    testDispatcherCalledBranchNode('test-dispatcher-close'),
    testDispatcherCalledBranchNode('test-dispatcher-destroy')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
