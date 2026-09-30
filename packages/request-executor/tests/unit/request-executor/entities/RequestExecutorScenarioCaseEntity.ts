import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 15 scenario shapes `request-executor.loop.spec.ts` exercises. */
export namespace RequestExecutorScenarioCaseEntity {
  const requestExecutorInputSchema = {
    'additionalProperties': false,
    'properties': {
      'context': { 'additionalProperties': false, 'properties': { 'name': { 'type': 'string' } }, 'required': ['name'], 'type': 'object' },
      'deadlineMs': { 'type': 'number' },
      'fetchClient': { 'additionalProperties': false, 'properties': { 'baseURL': { 'type': 'string' } }, 'type': 'object' },
      'retry': { 'additionalProperties': false, 'properties': { 'maximumRetries': { 'type': 'number' } }, 'type': 'object' }
    },
    'type': 'object'
  } as const;
  const RequestExecutorInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'context': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'deadlineMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'fetchClient': SchemaNode.defineObject({ 'type': 'object' } as const, { 'baseURL': SchemaNode.defineString({ 'type': 'string' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'retry': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumRetries': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const arbitraryValuesArraySchema = { 'items': { 'additionalProperties': true, 'properties': {}, 'type': 'object' }, 'type': 'array' } as const;
  const ArbitraryValuesArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} }), undefined);

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'accepted': { 'const': true } }, 'required': ['accepted'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'values': arbitraryValuesArraySchema }, 'required': ['values'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'entity-validates-deadlines' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'accepted': { 'const': false } }, 'required': ['accepted'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'values': arbitraryValuesArraySchema }, 'required': ['values'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'entity-rejects-invalid-deadline' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'requestMethod': { 'const': 'GET' },
              'requestUrl': { 'type': 'string' },
              'responseText': { 'type': 'string' },
              'result': { 'type': 'string' }
            },
            'required': ['requestMethod', 'requestUrl', 'responseText', 'result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'fetchInputUrl': { 'type': 'string' },
              'fetchMethod': { 'const': 'GET' },
              'fetchResponseText': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema,
              'requestPath': { 'type': 'string' }
            },
            'required': ['fetchInputUrl', 'fetchMethod', 'fetchResponseText', 'requestExecutor', 'requestPath'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'create-plain-config' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'string' }, 'retryTotalRetries': { 'type': 'number' }, 'sameFetchClient': { 'const': true } },
            'required': ['result', 'retryTotalRetries', 'sameFetchClient'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'requestExecutor': requestExecutorInputSchema, 'retryFailOnceMessage': { 'type': 'string' } },
            'required': ['requestExecutor', 'retryFailOnceMessage'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'create-with-instances' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'responseStatus': { 'type': 'number' }, 'responseText': { 'type': 'string' } },
            'required': ['responseStatus', 'responseText'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'fetchResponseText': { 'type': 'string' }, 'fetchUrl': { 'type': 'string' } },
            'required': ['fetchResponseText', 'fetchUrl'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'caller-owned-runtime-ports' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'observedRequestId': { 'type': 'string' } }, 'required': ['observedRequestId'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'contextValue': { 'type': 'string' },
              'fetchResponseText': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema
            },
            'required': ['contextValue', 'fetchResponseText', 'requestExecutor'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'context-roundtrip' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'observedSeed': { 'type': 'number' } }, 'required': ['observedSeed'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'contextSeed': { 'type': 'number' },
              'fetchResponseText': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema
            },
            'required': ['contextSeed', 'fetchResponseText', 'requestExecutor'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'context-seeded-values' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'aborted': { 'const': true } }, 'required': ['aborted'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'abortAfterMs': { 'type': 'number' },
              'fetchPath': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema
            },
            'required': ['abortAfterMs', 'fetchPath', 'requestExecutor'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cancellation-merged-signal' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'responseStatus': { 'type': 'number' }, 'signalAborted': { 'const': false } },
            'required': ['responseStatus', 'signalAborted'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'fetchDelayMs': { 'type': 'number' },
              'fetchPath': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema,
              'responseText': { 'type': 'string' }
            },
            'required': ['fetchDelayMs', 'fetchPath', 'requestExecutor', 'responseText'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cancellation-default-signal' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'responseStatus': { 'type': 'number' }, 'signalAborted': { 'const': false } },
            'required': ['responseStatus', 'signalAborted'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'fetchDelayMs': { 'type': 'number' },
              'fetchPath': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema,
              'responseText': { 'type': 'string' }
            },
            'required': ['fetchDelayMs', 'fetchPath', 'requestExecutor', 'responseText'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cancellation-deadline-only' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'hookNames': { 'items': { 'type': 'string' }, 'type': 'array' }, 'responseStatus': { 'type': 'number' } },
            'required': ['hookNames', 'responseStatus'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'fetchFailures': { 'type': 'number' },
              'fetchPath': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema
            },
            'required': ['fetchFailures', 'fetchPath', 'requestExecutor'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'hooks-bracket-retry-loop' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' }, 'hookNames': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['errorMessage', 'hookNames'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' }, 'requestExecutor': requestExecutorInputSchema },
            'required': ['errorMessage', 'requestExecutor'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'hooks-bracket-error' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' }, 'hookErrorCount': { 'type': 'number' }, 'hookErrorName': { 'type': 'string' } },
            'required': ['errorMessage', 'hookErrorCount', 'hookErrorName'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'errorMessage': { 'type': 'string' },
              'hookFailureMessage': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema
            },
            'required': ['errorMessage', 'hookFailureMessage', 'requestExecutor'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'hooks-error-not-swallowed' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'hookErrorCount': { 'type': 'number' }, 'responseStatus': { 'type': 'number' }, 'responseText': { 'type': 'string' } },
            'required': ['hookErrorCount', 'responseStatus', 'responseText'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'fetchResponseText': { 'type': 'string' }, 'fetchUrl': { 'type': 'string' } },
            'required': ['fetchResponseText', 'fetchUrl'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'hooks-noop-default' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'requestPaths': { 'items': { 'type': 'string' }, 'type': 'array' },
              'responseStatus': { 'type': 'number' },
              'responseStatuses': { 'items': { 'type': 'number' }, 'type': 'array' },
              'responseText': { 'type': 'string' },
              'retryAttempts': { 'items': { 'type': 'number' }, 'type': 'array' },
              'scheduledRetries': { 'items': { 'type': 'number' }, 'type': 'array' }
            },
            'required': ['requestPaths', 'responseStatus', 'responseStatuses', 'responseText', 'retryAttempts', 'scheduledRetries'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'fetchFailures': { 'type': 'number' },
              'fetchPath': { 'type': 'string' },
              'requestExecutor': requestExecutorInputSchema
            },
            'required': ['fetchFailures', 'fetchPath', 'requestExecutor'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'hooks-fire-through-executor' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, true as const) }, ['accepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': ArbitraryValuesArrayNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'entity-validates-deadlines' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, false as const) }, ['accepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': ArbitraryValuesArrayNode }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'entity-rejects-invalid-deadline' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'requestMethod': SchemaNode.defineConst({}, 'GET' as const),
        'requestUrl': SchemaNode.defineString({ 'type': 'string' } as const),
        'responseText': SchemaNode.defineString({ 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['requestMethod', 'requestUrl', 'responseText', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'fetchInputUrl': SchemaNode.defineString({ 'type': 'string' } as const),
        'fetchMethod': SchemaNode.defineConst({}, 'GET' as const),
        'fetchResponseText': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode,
        'requestPath': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['fetchInputUrl', 'fetchMethod', 'fetchResponseText', 'requestExecutor', 'requestPath'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'create-plain-config' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'retryTotalRetries': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'sameFetchClient': SchemaNode.defineConst({}, true as const)
      }, ['result', 'retryTotalRetries', 'sameFetchClient'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'requestExecutor': RequestExecutorInputNode, 'retryFailOnceMessage': SchemaNode.defineString({ 'type': 'string' } as const) }, ['requestExecutor', 'retryFailOnceMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'create-with-instances' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'responseStatus': SchemaNode.defineNumber({ 'type': 'number' } as const), 'responseText': SchemaNode.defineString({ 'type': 'string' } as const) }, ['responseStatus', 'responseText'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchResponseText': SchemaNode.defineString({ 'type': 'string' } as const), 'fetchUrl': SchemaNode.defineString({ 'type': 'string' } as const) }, ['fetchResponseText', 'fetchUrl'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'caller-owned-runtime-ports' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'observedRequestId': SchemaNode.defineString({ 'type': 'string' } as const) }, ['observedRequestId'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'contextValue': SchemaNode.defineString({ 'type': 'string' } as const),
        'fetchResponseText': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode
      }, ['contextValue', 'fetchResponseText', 'requestExecutor'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'context-roundtrip' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'observedSeed': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['observedSeed'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'contextSeed': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'fetchResponseText': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode
      }, ['contextSeed', 'fetchResponseText', 'requestExecutor'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'context-seeded-values' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'aborted': SchemaNode.defineConst({}, true as const) }, ['aborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'abortAfterMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'fetchPath': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode
      }, ['abortAfterMs', 'fetchPath', 'requestExecutor'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cancellation-merged-signal' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'responseStatus': SchemaNode.defineNumber({ 'type': 'number' } as const), 'signalAborted': SchemaNode.defineConst({}, false as const) }, ['responseStatus', 'signalAborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'fetchDelayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'fetchPath': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode,
        'responseText': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['fetchDelayMs', 'fetchPath', 'requestExecutor', 'responseText'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cancellation-default-signal' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'responseStatus': SchemaNode.defineNumber({ 'type': 'number' } as const), 'signalAborted': SchemaNode.defineConst({}, false as const) }, ['responseStatus', 'signalAborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'fetchDelayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'fetchPath': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode,
        'responseText': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['fetchDelayMs', 'fetchPath', 'requestExecutor', 'responseText'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cancellation-deadline-only' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'hookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'responseStatus': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['hookNames', 'responseStatus'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'fetchFailures': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'fetchPath': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode
      }, ['fetchFailures', 'fetchPath', 'requestExecutor'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'hooks-bracket-retry-loop' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
        'hookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
      }, ['errorMessage', 'hookNames'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'requestExecutor': RequestExecutorInputNode }, ['errorMessage', 'requestExecutor'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'hooks-bracket-error' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
        'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'hookErrorName': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['errorMessage', 'hookErrorCount', 'hookErrorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
        'hookFailureMessage': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode
      }, ['errorMessage', 'hookFailureMessage', 'requestExecutor'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'hooks-error-not-swallowed' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'responseStatus': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'responseText': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['hookErrorCount', 'responseStatus', 'responseText'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'fetchResponseText': SchemaNode.defineString({ 'type': 'string' } as const), 'fetchUrl': SchemaNode.defineString({ 'type': 'string' } as const) }, ['fetchResponseText', 'fetchUrl'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'hooks-noop-default' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'requestPaths': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'responseStatus': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'responseStatuses': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
        'responseText': SchemaNode.defineString({ 'type': 'string' } as const),
        'retryAttempts': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
        'scheduledRetries': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
      }, ['requestPaths', 'responseStatus', 'responseStatuses', 'responseText', 'retryAttempts', 'scheduledRetries'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'fetchFailures': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'fetchPath': SchemaNode.defineString({ 'type': 'string' } as const),
        'requestExecutor': RequestExecutorInputNode
      }, ['fetchFailures', 'fetchPath', 'requestExecutor'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'hooks-fire-through-executor' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
