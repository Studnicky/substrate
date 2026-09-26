import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The 20 scenario shapes `Signal.loop.spec.ts` exercises. */
export namespace SignalScenarioCaseEntity {
  const composeSignalIdSchema = { 'enum': ['abort-controller', 'provided'], 'type': 'string' } as const;
  const ComposeSignalIdNode = SchemaNode.defineEnum({ 'type': 'string' } as const, ['abort-controller', 'provided'] as const);

  const serializableComposeOptionsSchema = {
    'additionalProperties': false,
    'properties': { 'deadlineMs': { 'type': 'number' }, 'signalId': composeSignalIdSchema },
    'type': 'object'
  } as const;
  const SerializableComposeOptionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'deadlineMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'signalId': ComposeSignalIdNode }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'aborted': { 'const': false } }, 'required': ['aborted'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'aborted': { 'type': 'boolean' } }, 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'never-aborts' }
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
            'properties': { 'distinctInstances': { 'const': true }, 'firstAborted': { 'const': false }, 'secondAborted': { 'const': false } },
            'required': ['distinctInstances', 'firstAborted', 'secondAborted'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': {}, 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'never-distinct-instances' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'aborted': { 'const': false } }, 'required': ['aborted'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'aborted': { 'const': false }, 'composeOptions': serializableComposeOptionsSchema },
            'required': ['aborted', 'composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'compose-empty-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'sameSignal': { 'const': true } }, 'required': ['sameSignal'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'composeOptions': {
                'additionalProperties': false,
                'properties': { 'signalId': { 'const': 'provided' } },
                'required': ['signalId'],
                'type': 'object'
              }
            },
            'required': ['composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'compose-provided-signal' }
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
            'properties': { 'abortedAfterAbort': { 'const': true }, 'initialAborted': { 'const': false } },
            'required': ['abortedAfterAbort', 'initialAborted'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'composeOptions': {
                'additionalProperties': false,
                'properties': { 'deadlineMs': { 'type': 'number' }, 'signalId': { 'const': 'abort-controller' } },
                'required': ['deadlineMs', 'signalId'],
                'type': 'object'
              }
            },
            'required': ['composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'compose-signal-deadline-abort' }
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
            'properties': { 'abortedAfterWait': { 'const': true }, 'initialAborted': { 'const': false } },
            'required': ['abortedAfterWait', 'initialAborted'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'composeOptions': {
                'additionalProperties': false,
                'properties': { 'deadlineMs': { 'type': 'number' } },
                'required': ['deadlineMs'],
                'type': 'object'
              },
              'waitMs': { 'type': 'number' }
            },
            'required': ['composeOptions', 'waitMs'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'compose-deadline-fires' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorMessageIncludes': { 'type': 'string' } }, 'required': ['errorMessageIncludes'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'composeOptions': {
                'additionalProperties': false,
                'properties': { 'deadlineMs': { 'type': 'number' } },
                'required': ['deadlineMs'],
                'type': 'object'
              }
            },
            'required': ['composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'compose-invalid-deadline' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'aborted': { 'const': false } }, 'required': ['aborted'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'composeOptions': serializableComposeOptionsSchema },
            'required': ['composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'instance-empty-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'sameSignal': { 'const': true } }, 'required': ['sameSignal'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'composeOptions': {
                'additionalProperties': false,
                'properties': { 'signalId': { 'const': 'provided' } },
                'required': ['signalId'],
                'type': 'object'
              }
            },
            'required': ['composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'instance-provided-signal' }
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
            'properties': { 'callCount': { 'const': 1 }, 'resultMatches': { 'const': true } },
            'required': ['callCount', 'resultMatches'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'composeOptions': serializableComposeOptionsSchema },
            'required': ['composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'on-compose-signal-only' }
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
            'properties': { 'callCount': { 'const': 1 }, 'resultMatches': { 'const': true } },
            'required': ['callCount', 'resultMatches'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'composeOptions': serializableComposeOptionsSchema },
            'required': ['composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'on-compose-deadline-only' }
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
            'properties': { 'callCount': { 'const': 1 }, 'resultMatches': { 'const': true } },
            'required': ['callCount', 'resultMatches'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'composeOptions': serializableComposeOptionsSchema },
            'required': ['composeOptions'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'on-compose-empty-options' }
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
            'properties': { 'causeMessage': { 'type': 'string' }, 'hookName': { 'const': 'onCompose' } },
            'required': ['causeMessage', 'hookName'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'composeOptions': serializableComposeOptionsSchema, 'message': { 'type': 'string' } },
            'required': ['composeOptions', 'message'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'throwing-on-compose-surfaces' }
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
            'properties': { 'causeMessage': { 'type': 'string' }, 'hookName': { 'const': 'onCompose' } },
            'required': ['causeMessage', 'hookName'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'composeOptions': serializableComposeOptionsSchema, 'message': { 'type': 'string' } },
            'required': ['composeOptions', 'message'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'async-on-compose-rejection-surfaces' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'aborted': { 'const': false } }, 'required': ['aborted'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'composeOptions': serializableComposeOptionsSchema, 'message': { 'type': 'string' } },
            'required': ['composeOptions', 'message'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'swallowing-hook-invoker' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'outcome': { 'const': 'timeout' } }, 'required': ['outcome'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'waitMs': { 'type': 'number' } }, 'required': ['waitMs'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'race-timeout-no-signal' }
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
            'properties': { 'abortListenerCountAfter': { 'const': 0 }, 'abortListenerCountBefore': { 'const': 1 }, 'outcome': { 'const': 'timeout' } },
            'required': ['abortListenerCountAfter', 'abortListenerCountBefore', 'outcome'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'waitMs': { 'type': 'number' } }, 'required': ['waitMs'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'race-timeout-removes-listener' }
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
            'properties': { 'abortListenerCountAfter': { 'const': 0 }, 'abortListenerCountBefore': { 'const': 1 }, 'outcome': { 'const': 'aborted' } },
            'required': ['abortListenerCountAfter', 'abortListenerCountBefore', 'outcome'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'waitMs': { 'type': 'number' } }, 'required': ['waitMs'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'race-timeout-removes-listener-on-abort' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'outcome': { 'const': 'aborted' } }, 'required': ['outcome'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': {}, 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'race-timeout-already-aborted' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'code': { 'const': 'signal.invalidConfig' } }, 'required': ['code'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'message': { 'type': 'string' } }, 'required': ['message'], 'type': 'object' },
          'name': { 'type': 'string' },
          'shape': { 'const': 'signal-error-construction' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'aborted': SchemaNode.defineConst({}, false as const) }, ['aborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'aborted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'never-aborts' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'distinctInstances': SchemaNode.defineConst({}, true as const),
            'firstAborted': SchemaNode.defineConst({}, false as const),
            'secondAborted': SchemaNode.defineConst({}, false as const)
          }, ['distinctInstances', 'firstAborted', 'secondAborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'never-distinct-instances' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'aborted': SchemaNode.defineConst({}, false as const) }, ['aborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'aborted': SchemaNode.defineConst({}, false as const), 'composeOptions': SerializableComposeOptionsNode }, ['aborted', 'composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'compose-empty-options' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameSignal': SchemaNode.defineConst({}, true as const) }, ['sameSignal'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'composeOptions': SchemaNode.defineObject({ 'type': 'object' } as const, { 'signalId': SchemaNode.defineConst({}, 'provided' as const) }, ['signalId'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'compose-provided-signal' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortedAfterAbort': SchemaNode.defineConst({}, true as const), 'initialAborted': SchemaNode.defineConst({}, false as const) }, ['abortedAfterAbort', 'initialAborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'composeOptions': SchemaNode.defineObject({ 'type': 'object' } as const, { 'deadlineMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'signalId': SchemaNode.defineConst({}, 'abort-controller' as const) }, ['deadlineMs', 'signalId'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'compose-signal-deadline-abort' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortedAfterWait': SchemaNode.defineConst({}, true as const), 'initialAborted': SchemaNode.defineConst({}, false as const) }, ['abortedAfterWait', 'initialAborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'composeOptions': SchemaNode.defineObject({ 'type': 'object' } as const, { 'deadlineMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['deadlineMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
            'waitMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['composeOptions', 'waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'compose-deadline-fires' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessageIncludes': SchemaNode.defineString({ 'type': 'string' } as const) }, ['errorMessageIncludes'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'composeOptions': SchemaNode.defineObject({ 'type': 'object' } as const, { 'deadlineMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['deadlineMs'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'compose-invalid-deadline' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'aborted': SchemaNode.defineConst({}, false as const) }, ['aborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'composeOptions': SerializableComposeOptionsNode }, ['composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'instance-empty-options' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameSignal': SchemaNode.defineConst({}, true as const) }, ['sameSignal'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'composeOptions': SchemaNode.defineObject({ 'type': 'object' } as const, { 'signalId': SchemaNode.defineConst({}, 'provided' as const) }, ['signalId'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'instance-provided-signal' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'callCount': SchemaNode.defineConst({}, 1 as const), 'resultMatches': SchemaNode.defineConst({}, true as const) }, ['callCount', 'resultMatches'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'composeOptions': SerializableComposeOptionsNode }, ['composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'on-compose-signal-only' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'callCount': SchemaNode.defineConst({}, 1 as const), 'resultMatches': SchemaNode.defineConst({}, true as const) }, ['callCount', 'resultMatches'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'composeOptions': SerializableComposeOptionsNode }, ['composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'on-compose-deadline-only' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'callCount': SchemaNode.defineConst({}, 1 as const), 'resultMatches': SchemaNode.defineConst({}, true as const) }, ['callCount', 'resultMatches'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'composeOptions': SerializableComposeOptionsNode }, ['composeOptions'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'on-compose-empty-options' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'hookName': SchemaNode.defineConst({}, 'onCompose' as const) }, ['causeMessage', 'hookName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'composeOptions': SerializableComposeOptionsNode, 'message': SchemaNode.defineString({ 'type': 'string' } as const) }, ['composeOptions', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-on-compose-surfaces' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'causeMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'hookName': SchemaNode.defineConst({}, 'onCompose' as const) }, ['causeMessage', 'hookName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'composeOptions': SerializableComposeOptionsNode, 'message': SchemaNode.defineString({ 'type': 'string' } as const) }, ['composeOptions', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'async-on-compose-rejection-surfaces' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'aborted': SchemaNode.defineConst({}, false as const) }, ['aborted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'composeOptions': SerializableComposeOptionsNode, 'message': SchemaNode.defineString({ 'type': 'string' } as const) }, ['composeOptions', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'swallowing-hook-invoker' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'outcome': SchemaNode.defineConst({}, 'timeout' as const) }, ['outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'waitMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'race-timeout-no-signal' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'abortListenerCountAfter': SchemaNode.defineConst({}, 0 as const),
            'abortListenerCountBefore': SchemaNode.defineConst({}, 1 as const),
            'outcome': SchemaNode.defineConst({}, 'timeout' as const)
          }, ['abortListenerCountAfter', 'abortListenerCountBefore', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'waitMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'race-timeout-removes-listener' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'abortListenerCountAfter': SchemaNode.defineConst({}, 0 as const),
            'abortListenerCountBefore': SchemaNode.defineConst({}, 1 as const),
            'outcome': SchemaNode.defineConst({}, 'aborted' as const)
          }, ['abortListenerCountAfter', 'abortListenerCountBefore', 'outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'waitMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'race-timeout-removes-listener-on-abort' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'outcome': SchemaNode.defineConst({}, 'aborted' as const) }, ['outcome'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'race-timeout-already-aborted' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'code': SchemaNode.defineConst({}, 'signal.invalidConfig' as const) }, ['code'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'type': 'string' } as const) }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'signal-error-construction' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;
}
