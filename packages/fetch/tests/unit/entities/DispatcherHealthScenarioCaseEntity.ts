import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `dispatcher-health.loop.spec.ts` scenario case shape: one `oneOf` branch per `shape`, grouped the same way the file's original hand-written generics grouped them. */
export namespace DispatcherHealthScenarioCaseEntity {
  const dispatcherInputSchema = { 'additionalProperties': false, 'properties': { 'connections': { 'minimum': 1, 'type': 'integer' } }, 'required': ['connections'], 'type': 'object' } as const;
  const DispatcherInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'connections': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const) }, ['connections'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const caseFields = { 'description': { 'minLength': 1, 'type': 'string' }, 'name': { 'minLength': 1, 'type': 'string' } } as const;
  const caseNodeFields = {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  };

  function emptyStatsBranch<TShape extends string>(shape: TShape) {
    return {
      'additionalProperties': false,
      'properties': {
        ...caseFields,
        'expected': { 'additionalProperties': false, 'properties': { 'frozen': { 'const': false }, 'objectKeys': { 'type': 'integer' } }, 'required': ['frozen', 'objectKeys'], 'type': 'object' },
        'input': { 'additionalProperties': false, 'properties': { 'dispatcher': dispatcherInputSchema }, 'required': ['dispatcher'], 'type': 'object' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function emptyStatsBranchNode<TShape extends string>(shape: TShape) {
    return SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'frozen': SchemaNode.defineConst({}, false as const), 'objectKeys': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['frozen', 'objectKeys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'dispatcher': DispatcherInputNode }, ['dispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  }

  function structureStatsBranch<TShape extends string>(shape: TShape) {
    return {
      'additionalProperties': false,
      'properties': {
        ...caseFields,
        'expected': { 'additionalProperties': false, 'properties': { 'frozen': { 'type': 'boolean' }, 'objectKeys': { 'type': 'integer' } }, 'required': ['frozen', 'objectKeys'], 'type': 'object' },
        'input': { 'additionalProperties': false, 'properties': { 'dispatcher': dispatcherInputSchema }, 'required': ['dispatcher'], 'type': 'object' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function structureStatsBranchNode<TShape extends string>(shape: TShape) {
    return SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'frozen': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'objectKeys': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['frozen', 'objectKeys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'dispatcher': DispatcherInputNode }, ['dispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  }

  function frozenStatsBranch<TShape extends string>(shape: TShape) {
    return {
      'additionalProperties': false,
      'properties': {
        ...caseFields,
        'expected': { 'additionalProperties': false, 'properties': { 'frozen': { 'const': true } }, 'required': ['frozen'], 'type': 'object' },
        'input': { 'additionalProperties': false, 'properties': { 'dispatcher': dispatcherInputSchema }, 'required': ['dispatcher'], 'type': 'object' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function frozenStatsBranchNode<TShape extends string>(shape: TShape) {
    return SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'frozen': SchemaNode.defineConst({}, true as const) }, ['frozen'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'dispatcher': DispatcherInputNode }, ['dispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  }

  const testDispatcherSchema = { 'additionalProperties': false, 'properties': { 'connections': { 'minimum': 1, 'type': 'integer' }, 'enabled': { 'type': 'boolean' } }, 'required': ['connections', 'enabled'], 'type': 'object' } as const;
  const TestDispatcherNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'connections': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['connections', 'enabled'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  function testTransportBranch<TShape extends string>(shape: TShape) {
    return {
      'additionalProperties': false,
      'properties': {
        ...caseFields,
        'expected': {
          'additionalProperties': false,
          'properties': { 'healthy': { 'type': 'boolean' }, 'queueRatio': { 'type': 'number' }, 'recommendationIncludes': { 'minLength': 1, 'type': 'string' } },
          'required': ['healthy', 'queueRatio', 'recommendationIncludes'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'origin': { 'minLength': 1, 'type': 'string' }, 'path': { 'minLength': 1, 'type': 'string' }, 'queuedPath': { 'minLength': 1, 'type': 'string' }, 'testDispatcher': testDispatcherSchema },
          'required': ['origin', 'path', 'testDispatcher'],
          'type': 'object'
        },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
  }
  function testTransportBranchNode<TShape extends string>(shape: TShape) {
    return SchemaNode.defineObject({ 'type': 'object' } as const, {
        ...caseNodeFields,
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'healthy': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'queueRatio': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'recommendationIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['healthy', 'queueRatio', 'recommendationIncludes'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'origin': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'queuedPath': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'testDispatcher': TestDispatcherNode
          }, ['origin', 'path', 'testDispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, shape)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  }

  const dispatcherOriginInputSchema = { 'additionalProperties': false, 'properties': { 'dispatcher': dispatcherInputSchema, 'origin': { 'minLength': 1, 'type': 'string' } }, 'required': ['dispatcher', 'origin'], 'type': 'object' } as const;
  const DispatcherOriginInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'dispatcher': DispatcherInputNode, 'origin': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['dispatcher', 'origin'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const healthyNonExistentOriginSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': {
        'additionalProperties': false,
        'properties': {
          'healthy': { 'const': true },
          'queueRatio': { 'const': '__UNDEFINED__' },
          'recommendation': { 'const': '__UNDEFINED__' },
          'stats': { 'const': '__UNDEFINED__' }
        },
        'required': ['healthy', 'queueRatio', 'recommendation', 'stats'],
        'type': 'object'
      },
      'input': dispatcherOriginInputSchema,
      'shape': { 'const': 'healthy-non-existent-origin' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const HealthyNonExistentOriginNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'healthy': SchemaNode.defineConst({}, true as const),
          'queueRatio': SchemaNode.defineConst({}, '__UNDEFINED__' as const),
          'recommendation': SchemaNode.defineConst({}, '__UNDEFINED__' as const),
          'stats': SchemaNode.defineConst({}, '__UNDEFINED__' as const)
        }, ['healthy', 'queueRatio', 'recommendation', 'stats'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': DispatcherOriginInputNode,
      'shape': SchemaNode.defineConst({}, 'healthy-non-existent-origin' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const healthyNewDispatcherSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'healthy': { 'const': true }, 'objectKeys': { 'type': 'integer' } }, 'required': ['healthy', 'objectKeys'], 'type': 'object' },
      'input': dispatcherOriginInputSchema,
      'shape': { 'const': 'healthy-new-dispatcher' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const HealthyNewDispatcherNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'healthy': SchemaNode.defineConst({}, true as const), 'objectKeys': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['healthy', 'objectKeys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': DispatcherOriginInputNode,
      'shape': SchemaNode.defineConst({}, 'healthy-new-dispatcher' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const healthInterfaceShapeSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': {
        'additionalProperties': false,
        'properties': {
          'healthyType': { 'const': 'boolean' },
          'queueRatioType': { 'const': 'number-or-undefined' },
          'recommendationType': { 'const': 'string-or-undefined' },
          'statsType': { 'const': 'object-or-undefined' }
        },
        'required': ['healthyType', 'queueRatioType', 'recommendationType', 'statsType'],
        'type': 'object'
      },
      'input': dispatcherOriginInputSchema,
      'shape': { 'const': 'health-interface-shape' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const HealthInterfaceShapeNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'healthyType': SchemaNode.defineConst({}, 'boolean' as const),
          'queueRatioType': SchemaNode.defineConst({}, 'number-or-undefined' as const),
          'recommendationType': SchemaNode.defineConst({}, 'string-or-undefined' as const),
          'statsType': SchemaNode.defineConst({}, 'object-or-undefined' as const)
        }, ['healthyType', 'queueRatioType', 'recommendationType', 'statsType'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': DispatcherOriginInputNode,
      'shape': SchemaNode.defineConst({}, 'health-interface-shape' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const closeAfterIdleSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'closed': { 'const': true } }, 'required': ['closed'], 'type': 'object' },
      'input': { 'additionalProperties': false, 'properties': { 'dispatcher': dispatcherInputSchema }, 'required': ['dispatcher'], 'type': 'object' },
      'shape': { 'const': 'close-after-idle' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const CloseAfterIdleNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'closed': SchemaNode.defineConst({}, true as const) }, ['closed'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'dispatcher': DispatcherInputNode }, ['dispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'close-after-idle' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const destroyWithTimeoutSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'destroyedAfterWait': { 'const': true } }, 'required': ['destroyedAfterWait'], 'type': 'object' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'destroy': { 'additionalProperties': false, 'properties': { 'timeout': { 'type': 'integer' } }, 'required': ['timeout'], 'type': 'object' },
          'dispatcher': dispatcherInputSchema
        },
        'required': ['destroy', 'dispatcher'],
        'type': 'object'
      },
      'shape': { 'const': 'destroy-with-timeout' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const DestroyWithTimeoutNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'destroyedAfterWait': SchemaNode.defineConst({}, true as const) }, ['destroyedAfterWait'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'destroy': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['timeout'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'dispatcher': DispatcherInputNode }, ['destroy', 'dispatcher'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'destroy-with-timeout' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const rejectInvalidAgentSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'message': { 'minLength': 1, 'type': 'string' } }, 'required': ['message'], 'type': 'object' },
      'input': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' },
      'shape': { 'const': 'reject-invalid-agent' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const RejectInvalidAgentNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'shape': SchemaNode.defineConst({}, 'reject-invalid-agent' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const testTransportDelegatesSchema = {
    'additionalProperties': false,
    'properties': {
      ...caseFields,
      'expected': { 'additionalProperties': false, 'properties': { 'healthy': { 'const': true }, 'statsKeys': { 'type': 'integer' } }, 'required': ['healthy', 'statsKeys'], 'type': 'object' },
      'input': dispatcherOriginInputSchema,
      'shape': { 'const': 'test-transport-delegates' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const TestTransportDelegatesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      ...caseNodeFields,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'healthy': SchemaNode.defineConst({}, true as const), 'statsKeys': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['healthy', 'statsKeys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': DispatcherOriginInputNode,
      'shape': SchemaNode.defineConst({}, 'test-transport-delegates' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      emptyStatsBranch('empty-stats'),
      emptyStatsBranch('stats-object-after-requests'),
      structureStatsBranch('structure-after-get-stats'),
      frozenStatsBranch('frozen-stats-object'),
      frozenStatsBranch('deeply-frozen-stats'),
      healthyNonExistentOriginSchema,
      healthyNewDispatcherSchema,
      testTransportBranch('test-transport-overloaded'),
      testTransportBranch('test-transport-pressure'),
      healthInterfaceShapeSchema,
      closeAfterIdleSchema,
      destroyWithTimeoutSchema,
      rejectInvalidAgentSchema,
      testTransportDelegatesSchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    emptyStatsBranchNode('empty-stats'),
    emptyStatsBranchNode('stats-object-after-requests'),
    structureStatsBranchNode('structure-after-get-stats'),
    frozenStatsBranchNode('frozen-stats-object'),
    frozenStatsBranchNode('deeply-frozen-stats'),
    HealthyNonExistentOriginNode,
    HealthyNewDispatcherNode,
    testTransportBranchNode('test-transport-overloaded'),
    testTransportBranchNode('test-transport-pressure'),
    HealthInterfaceShapeNode,
    CloseAfterIdleNode,
    DestroyWithTimeoutNode,
    RejectInvalidAgentNode,
    TestTransportDelegatesNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
