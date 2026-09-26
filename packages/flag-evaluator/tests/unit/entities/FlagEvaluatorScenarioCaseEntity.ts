import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { FlagContextEntity } from '../../../src/entities/FlagContextEntity.js';
import { FlagDefinitionEntity } from '../../../src/entities/FlagDefinitionEntity.js';

/** The 23 scenario shapes `FlagEvaluator.loop.spec.ts` exercises. `values`/`value` in the two `FlagContextEntity` shapes stay fully open bags, since they intentionally exercise invalid contexts; every other context reuses `FlagContextEntity` itself. */
export namespace FlagEvaluatorScenarioCaseEntity {
  const openBagSchema = { 'additionalProperties': true, 'properties': {}, 'type': 'object' } as const;
  const contextSchema = FlagContextEntity.Schema;
  const definitionSchema = FlagDefinitionEntity.Schema;
  const partialDefinitionSchema = {
    'additionalProperties': false,
    'properties': { 'defaultValue': { 'type': 'boolean' }, 'enabled': { 'type': 'boolean' }, 'rolloutPercent': { 'type': 'number' } },
    'required': ['enabled'],
    'type': 'object'
  } as const;
  /** Same required fields as `FlagDefinitionEntity`, but no `rolloutPercent` bound — this fixture's whole point is submitting a value outside that bound. */
  const unboundedDefinitionSchema = {
    'additionalProperties': false,
    'properties': { 'defaultValue': { 'type': 'boolean' }, 'enabled': { 'type': 'boolean' }, 'rolloutPercent': { 'type': 'number' } },
    'required': ['defaultValue', 'enabled'],
    'type': 'object'
  } as const;
  const definitionsMapSchema = { 'additionalProperties': definitionSchema, 'properties': {}, 'type': 'object' } as const;
  const evaluationSchema = {
    'additionalProperties': false,
    'properties': { 'context': contextSchema, 'flag': { 'type': 'string' } },
    'required': ['context', 'flag'],
    'type': 'object'
  } as const;
  const evaluationWithResultSchema = {
    'additionalProperties': false,
    'properties': { 'context': contextSchema, 'result': { 'type': 'boolean' } },
    'required': ['context', 'result'],
    'type': 'object'
  } as const;
  const resultsMapSchema = { 'additionalProperties': { 'type': 'boolean' }, 'properties': {}, 'type': 'object' } as const;

  const OpenBagNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true });
  const ContextNode = FlagContextEntity.Node;
  const DefinitionNode = FlagDefinitionEntity.Node;
  const PartialDefinitionNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'defaultValue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'rolloutPercent': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['enabled'] as const,
    { 'additionalProperties': false }
  );
  const UnboundedDefinitionNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'defaultValue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'rolloutPercent': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['defaultValue', 'enabled'] as const,
    { 'additionalProperties': false }
  );
  const DefinitionsMapNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': DefinitionNode });
  const EvaluationNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'context': ContextNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['context', 'flag'] as const,
    { 'additionalProperties': false }
  );
  const EvaluationWithResultNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'context': ContextNode, 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
    ['context', 'result'] as const,
    { 'additionalProperties': false }
  );
  const ResultsMapNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) });

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'flagEvaluator': { 'additionalProperties': false, 'properties': { 'context': contextSchema, 'flag': { 'type': 'string' } }, 'required': ['context', 'flag'], 'type': 'object' } },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'unregistered-flag' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'results': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
            'required': ['results'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'definitions': definitionsMapSchema, 'evaluations': { 'items': evaluationSchema, 'type': 'array' } },
                'required': ['definitions', 'evaluations'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'disabled-flags' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'contexts': { 'items': contextSchema, 'type': 'array' }, 'definition': definitionSchema, 'flag': { 'type': 'string' } },
                'required': ['contexts', 'definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'implicit-full-rollout' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'hasFalse': { 'type': 'boolean' }, 'hasTrue': { 'type': 'boolean' } },
            'required': ['hasFalse', 'hasTrue'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'definition': definitionSchema, 'evaluations': { 'items': evaluationWithResultSchema, 'type': 'array' }, 'flag': { 'type': 'string' } },
                'required': ['definition', 'evaluations', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'half-rollout' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'definition': definitionSchema, 'flag': { 'type': 'string' } },
                'required': ['context', 'definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'deterministic-rollout' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'results': resultsMapSchema },
            'required': ['results'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'definitions': definitionsMapSchema, 'flags': { 'items': { 'type': 'string' }, 'type': 'array' } },
                'required': ['context', 'definitions', 'flags'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'independent-flags' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'hasAfterRegister': { 'type': 'boolean' },
              'hasAfterUnregister': { 'type': 'boolean' },
              'hasBefore': { 'type': 'boolean' },
              'listAfterRegister': { 'items': { 'type': 'string' }, 'type': 'array' },
              'listAfterUnregister': { 'items': { 'type': 'string' }, 'type': 'array' },
              'listBefore': { 'items': { 'type': 'string' }, 'type': 'array' }
            },
            'required': ['hasAfterRegister', 'hasAfterUnregister', 'hasBefore', 'listAfterRegister', 'listAfterUnregister', 'listBefore'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': {
                  'definition': definitionSchema,
                  'flags': { 'items': { 'type': 'string' }, 'type': 'array' },
                  'missingFlag': { 'type': 'string' },
                  'unregisterFlag': { 'type': 'string' }
                },
                'required': ['definition', 'flags', 'missingFlag', 'unregisterFlag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'register-has-list-unregister' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'first': { 'type': 'boolean' }, 'second': { 'type': 'boolean' } },
            'required': ['first', 'second'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'firstDefinition': definitionSchema, 'flag': { 'type': 'string' }, 'secondDefinition': definitionSchema },
                'required': ['context', 'firstDefinition', 'flag', 'secondDefinition'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 're-register-replaces' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'definition': definitionSchema, 'flag': { 'type': 'string' }, 'mutatedDefinition': definitionSchema },
                'required': ['context', 'definition', 'flag', 'mutatedDefinition'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'register-snapshots-definition' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': openBagSchema,
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'definition': unboundedDefinitionSchema, 'flag': { 'type': 'string' } },
                'required': ['definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'invalid-rollout-range' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'message': { 'type': 'string' } },
            'required': ['message'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'definition': partialDefinitionSchema, 'flag': { 'type': 'string' } },
                'required': ['definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'missing-default-value' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'definition': definitionSchema, 'flag': { 'type': 'string' } },
                'required': ['context', 'definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'valid-definition-still-works' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'defaultCalls': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['defaultCalls'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'flagEvaluator': { 'additionalProperties': false, 'properties': { 'context': contextSchema, 'flag': { 'type': 'string' } }, 'required': ['context', 'flag'], 'type': 'object' } },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-on-default' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'ruleMismatchFlags': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['ruleMismatchFlags'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'definitions': definitionsMapSchema, 'evaluations': { 'items': evaluationSchema, 'type': 'array' } },
                'required': ['definitions', 'evaluations'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-on-rule-mismatch' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'evaluateCalls': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'flag': { 'type': 'string' }, 'result': { 'type': 'boolean' } },
                  'required': ['flag', 'result'],
                  'type': 'object'
                },
                'type': 'array'
              }
            },
            'required': ['evaluateCalls'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'definitions': definitionsMapSchema, 'evaluations': { 'items': evaluationSchema, 'type': 'array' } },
                'required': ['definitions', 'evaluations'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-on-evaluate' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'order': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['order'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'definitions': definitionsMapSchema, 'evaluations': { 'items': evaluationSchema, 'type': 'array' } },
                'required': ['definitions', 'evaluations'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-order' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'context': contextSchema },
            'required': ['context'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'definition': definitionSchema, 'flag': { 'type': 'string' } },
                'required': ['context', 'definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-context-match' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'flagEvaluator': { 'additionalProperties': false, 'properties': { 'context': contextSchema, 'flag': { 'type': 'string' } }, 'required': ['context', 'flag'], 'type': 'object' } },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-on-default' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'definition': definitionSchema, 'flag': { 'type': 'string' } },
                'required': ['context', 'definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-on-rule-mismatch' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'definition': definitionSchema, 'flag': { 'type': 'string' } },
                'required': ['context', 'definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-on-evaluate' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'rejectionEvents': { 'items': {}, 'type': 'array' }, 'result': { 'type': 'boolean' } },
            'required': ['rejectionEvents', 'result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'flagEvaluator': {
                'additionalProperties': false,
                'properties': { 'context': contextSchema, 'definition': definitionSchema, 'flag': { 'type': 'string' } },
                'required': ['context', 'definition', 'flag'],
                'type': 'object'
              }
            },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'async-on-evaluate-safe' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'flagEvaluator': { 'additionalProperties': false, 'properties': { 'values': { 'items': openBagSchema, 'type': 'array' } }, 'required': ['values'], 'type': 'object' } },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'flag-context-entity-accepts' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'boolean' } },
            'required': ['result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'flagEvaluator': { 'additionalProperties': false, 'properties': { 'value': openBagSchema }, 'required': ['value'], 'type': 'object' } },
            'required': ['flagEvaluator'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'flag-context-entity-rejects' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('unregistered-flag' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const)) },
          ['results'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'definitions': DefinitionsMapNode, 'evaluations': SchemaNode.defineArray({ 'type': 'array' } as const, EvaluationNode) },
              ['definitions', 'evaluations'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('disabled-flags' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'contexts': SchemaNode.defineArray({ 'type': 'array' } as const, ContextNode),
                'definition': DefinitionNode,
                'flag': SchemaNode.defineString({ 'type': 'string' } as const)
              },
              ['contexts', 'definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('implicit-full-rollout' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'hasFalse': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'hasTrue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
          ['hasFalse', 'hasTrue'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'definition': DefinitionNode,
                'evaluations': SchemaNode.defineArray({ 'type': 'array' } as const, EvaluationWithResultNode),
                'flag': SchemaNode.defineString({ 'type': 'string' } as const)
              },
              ['definition', 'evaluations', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('half-rollout' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'definition': DefinitionNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('deterministic-rollout' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'results': ResultsMapNode }, ['results'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'context': ContextNode,
                'definitions': DefinitionsMapNode,
                'flags': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
              },
              ['context', 'definitions', 'flags'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('independent-flags' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'hasAfterRegister': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'hasAfterUnregister': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'hasBefore': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'listAfterRegister': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
            'listAfterUnregister': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
            'listBefore': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
          },
          ['hasAfterRegister', 'hasAfterUnregister', 'hasBefore', 'listAfterRegister', 'listAfterUnregister', 'listBefore'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'definition': DefinitionNode,
                'flags': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
                'missingFlag': SchemaNode.defineString({ 'type': 'string' } as const),
                'unregisterFlag': SchemaNode.defineString({ 'type': 'string' } as const)
              },
              ['definition', 'flags', 'missingFlag', 'unregisterFlag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('register-has-list-unregister' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'first': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'second': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
          ['first', 'second'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'context': ContextNode,
                'firstDefinition': DefinitionNode,
                'flag': SchemaNode.defineString({ 'type': 'string' } as const),
                'secondDefinition': DefinitionNode
              },
              ['context', 'firstDefinition', 'flag', 'secondDefinition'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('re-register-replaces' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'context': ContextNode,
                'definition': DefinitionNode,
                'flag': SchemaNode.defineString({ 'type': 'string' } as const),
                'mutatedDefinition': DefinitionNode
              },
              ['context', 'definition', 'flag', 'mutatedDefinition'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('register-snapshots-definition' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': OpenBagNode,
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'definition': UnboundedDefinitionNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('invalid-rollout-range' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'message': SchemaNode.defineString({ 'type': 'string' } as const) }, ['message'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'definition': PartialDefinitionNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('missing-default-value' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'definition': DefinitionNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('valid-definition-still-works' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'defaultCalls': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) },
          ['defaultCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hook-on-default' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'ruleMismatchFlags': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) },
          ['ruleMismatchFlags'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'definitions': DefinitionsMapNode, 'evaluations': SchemaNode.defineArray({ 'type': 'array' } as const, EvaluationNode) },
              ['definitions', 'evaluations'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hook-on-rule-mismatch' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'evaluateCalls': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'flag': SchemaNode.defineString({ 'type': 'string' } as const), 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
                ['flag', 'result'] as const,
                { 'additionalProperties': false }
              )
            )
          },
          ['evaluateCalls'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'definitions': DefinitionsMapNode, 'evaluations': SchemaNode.defineArray({ 'type': 'array' } as const, EvaluationNode) },
              ['definitions', 'evaluations'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hook-on-evaluate' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) },
          ['order'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'definitions': DefinitionsMapNode, 'evaluations': SchemaNode.defineArray({ 'type': 'array' } as const, EvaluationNode) },
              ['definitions', 'evaluations'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hook-order' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'context': ContextNode }, ['context'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'definition': DefinitionNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('hook-context-match' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('throwing-on-default' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'definition': DefinitionNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('throwing-on-rule-mismatch' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'definition': DefinitionNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('throwing-on-evaluate' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'rejectionEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({} as const)), 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
          ['rejectionEvents', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'context': ContextNode, 'definition': DefinitionNode, 'flag': SchemaNode.defineString({ 'type': 'string' } as const) },
              ['context', 'definition', 'flag'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('async-on-evaluate-safe' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, OpenBagNode) },
              ['values'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('flag-context-entity-accepts' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false }),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'flagEvaluator': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'value': OpenBagNode },
              ['value'] as const,
              { 'additionalProperties': false }
            )
          },
          ['flagEvaluator'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('flag-context-entity-rejects' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
