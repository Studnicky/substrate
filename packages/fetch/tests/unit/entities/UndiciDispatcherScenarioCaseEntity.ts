import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
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
  const TestDispatcherNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'connections': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const statsBagSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const StatsBagNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} });

  const connectionStatsSchema = SocketDispatcherStatsEntity.Schema;
  const ConnectionStatsNode = SocketDispatcherStatsEntity.Node;

  const agentOptionsSchema = { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const AgentOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} });

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
  const ConstructorInvalidAgentNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'throws' as const) }, ['message', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'agent': BoundedJsonValueEntity.Node }, ['agent'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'constructor-invalid-agent' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  class UndiciDispatcherScenarioCaseEntityBuilders {
    static healthyStatsBranch<TShape extends 'health-invalid-stats' | 'health-no-stats'>(shape: TShape) {
      const result = {
        'additionalProperties': false,
        'properties': { ...caseFields, 'expected': { 'additionalProperties': false, 'properties': { 'shape': { 'const': 'healthy' } }, 'required': ['shape'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'origin': originField, 'stats': statsBagSchema }, 'required': ['origin'], 'type': 'object' }, 'shape': { 'const': shape } },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      } as const;
      return result;
    }

    static healthyStatsBranchNode<TShape extends 'health-invalid-stats' | 'health-no-stats'>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'healthy' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'origin': OriginNode, 'stats': StatsBagNode }, ['origin'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }

    static healthBranch<TShape extends 'health-ok' | 'health-overload' | 'health-pressure'>(shape: TShape) {
      const result = {
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
      return result;
    }

    static healthBranchNode<TShape extends 'health-ok' | 'health-overload' | 'health-pressure'>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'healthy': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'recommendationIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'shape': SchemaNode.defineConst({}, 'health' as const)
        }, ['healthy', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'origin': OriginNode, 'stats': ConnectionStatsNode }, ['origin', 'stats'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }

    static agentOperationBranch<TShape extends 'close-agent' | 'destroy-agent' | 'destroy-agent-delay' | 'destroy-agent-zero'>(shape: TShape) {
      const result = {
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
      return result;
    }

    static agentOperationBranchNode<TShape extends 'close-agent' | 'destroy-agent' | 'destroy-agent-delay' | 'destroy-agent-zero'>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'called' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'agent': AgentOptionsNode, 'timeout': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }

    static testDispatcherCalledBranch<TShape extends 'test-dispatcher-close' | 'test-dispatcher-destroy'>(shape: TShape) {
      const result = {
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
      return result;
    }

    static testDispatcherCalledBranchNode<TShape extends 'test-dispatcher-close' | 'test-dispatcher-destroy'>(shape: TShape) {
      const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'called' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'testDispatcher': TestDispatcherNode }, ['testDispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
      return result;
    }
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
  const GetStatsFreezeNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'frozen' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'origin': OriginNode, 'stats': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': ConnectionStatsNode, 'patternProperties': {} }) }, ['origin', 'stats'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'get-stats-freeze' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

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
  const TestDispatcherHealthNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    ...caseNodeFields,
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'healthy' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'origin': OriginNode, 'testDispatcher': TestDispatcherNode }, ['origin', 'testDispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'shape': SchemaNode.defineConst({}, 'test-dispatcher-health' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      constructorInvalidAgentSchema,
      UndiciDispatcherScenarioCaseEntityBuilders.healthyStatsBranch('health-no-stats'),
      UndiciDispatcherScenarioCaseEntityBuilders.healthyStatsBranch('health-invalid-stats'),
      UndiciDispatcherScenarioCaseEntityBuilders.healthBranch('health-pressure'),
      UndiciDispatcherScenarioCaseEntityBuilders.healthBranch('health-overload'),
      UndiciDispatcherScenarioCaseEntityBuilders.healthBranch('health-ok'),
      getStatsFreezeSchema,
      UndiciDispatcherScenarioCaseEntityBuilders.agentOperationBranch('close-agent'),
      UndiciDispatcherScenarioCaseEntityBuilders.agentOperationBranch('destroy-agent'),
      UndiciDispatcherScenarioCaseEntityBuilders.agentOperationBranch('destroy-agent-delay'),
      UndiciDispatcherScenarioCaseEntityBuilders.agentOperationBranch('destroy-agent-zero'),
      testDispatcherHealthSchema,
      UndiciDispatcherScenarioCaseEntityBuilders.testDispatcherCalledBranch('test-dispatcher-close'),
      UndiciDispatcherScenarioCaseEntityBuilders.testDispatcherCalledBranch('test-dispatcher-destroy')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ConstructorInvalidAgentNode,
    UndiciDispatcherScenarioCaseEntityBuilders.healthyStatsBranchNode('health-no-stats'),
    UndiciDispatcherScenarioCaseEntityBuilders.healthyStatsBranchNode('health-invalid-stats'),
    UndiciDispatcherScenarioCaseEntityBuilders.healthBranchNode('health-pressure'),
    UndiciDispatcherScenarioCaseEntityBuilders.healthBranchNode('health-overload'),
    UndiciDispatcherScenarioCaseEntityBuilders.healthBranchNode('health-ok'),
    GetStatsFreezeNode,
    UndiciDispatcherScenarioCaseEntityBuilders.agentOperationBranchNode('close-agent'),
    UndiciDispatcherScenarioCaseEntityBuilders.agentOperationBranchNode('destroy-agent'),
    UndiciDispatcherScenarioCaseEntityBuilders.agentOperationBranchNode('destroy-agent-delay'),
    UndiciDispatcherScenarioCaseEntityBuilders.agentOperationBranchNode('destroy-agent-zero'),
    TestDispatcherHealthNode,
    UndiciDispatcherScenarioCaseEntityBuilders.testDispatcherCalledBranchNode('test-dispatcher-close'),
    UndiciDispatcherScenarioCaseEntityBuilders.testDispatcherCalledBranchNode('test-dispatcher-destroy')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
