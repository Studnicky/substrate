import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 2 scenario shapes `MatchingFilters.loop.spec.ts` exercises. */
export namespace MatchingFiltersScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'expected': {
            'additionalProperties': false,
            'properties': {
              'cosine': { 'type': 'boolean' },
              'jaccard': { 'type': 'boolean' },
              'levenshtein': { 'type': 'boolean' },
              'ngram': { 'type': 'boolean' }
            },
            'required': ['cosine', 'jaccard', 'levenshtein', 'ngram'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'number': { 'type': 'number' },
              'text': { 'type': 'string' },
              'threshold': { 'type': 'number' },
              'tokens': { 'items': { 'type': 'string' }, 'type': 'array' }
            },
            'required': ['number', 'text', 'threshold', 'tokens'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'malformed-inputs' }
        },
        'required': ['expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'expected': {
            'additionalProperties': false,
            'properties': {
              'cosine': { 'type': 'boolean' },
              'damerauLevenshtein': { 'type': 'boolean' },
              'jaccard': { 'type': 'boolean' },
              'jaro': { 'type': 'boolean' },
              'jaroWinkler': { 'type': 'boolean' },
              'levenshtein': { 'type': 'boolean' },
              'ngram': { 'type': 'boolean' },
              'sorensenDice': { 'type': 'boolean' }
            },
            'required': ['cosine', 'damerauLevenshtein', 'jaccard', 'jaro', 'jaroWinkler', 'levenshtein', 'ngram', 'sorensenDice'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'cosine': {
                'additionalProperties': false,
                'properties': {
                  'comparison': { 'type': 'number' },
                  'key': { 'type': 'string' },
                  'threshold': { 'type': 'number' },
                  'value': { 'type': 'number' }
                },
                'required': ['comparison', 'key', 'threshold', 'value'],
                'type': 'object'
              },
              'ngram': {
                'additionalProperties': false,
                'properties': {
                  'comparison': { 'type': 'string' },
                  'size': { 'type': 'number' },
                  'threshold': { 'type': 'number' },
                  'value': { 'type': 'string' }
                },
                'required': ['comparison', 'size', 'threshold', 'value'],
                'type': 'object'
              },
              'text': {
                'additionalProperties': false,
                'properties': {
                  'comparison': { 'type': 'string' },
                  'jaroComparison': { 'type': 'string' },
                  'jaroThreshold': { 'type': 'number' },
                  'jaroValue': { 'type': 'string' },
                  'jaroWinklerThreshold': { 'type': 'number' },
                  'threshold': { 'type': 'number' },
                  'transpositionComparison': { 'type': 'string' },
                  'transpositionThreshold': { 'type': 'number' },
                  'transpositionValue': { 'type': 'string' },
                  'value': { 'type': 'string' }
                },
                'required': ['comparison', 'jaroComparison', 'jaroThreshold', 'jaroValue', 'jaroWinklerThreshold', 'threshold', 'transpositionComparison', 'transpositionThreshold', 'transpositionValue', 'value'],
                'type': 'object'
              },
              'token': {
                'additionalProperties': false,
                'properties': {
                  'comparison': { 'items': { 'type': 'string' }, 'type': 'array' },
                  'threshold': { 'type': 'number' },
                  'value': { 'items': { 'type': 'string' }, 'type': 'array' }
                },
                'required': ['comparison', 'threshold', 'value'],
                'type': 'object'
              }
            },
            'required': ['cosine', 'ngram', 'text', 'token'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'valid-adapters' }
        },
        'required': ['expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'cosine': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'jaccard': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'levenshtein': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'ngram': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, ['cosine', 'jaccard', 'levenshtein', 'ngram'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'number': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'text': SchemaNode.defineString({ 'type': 'string' } as const),
        'threshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'tokens': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
      }, ['number', 'text', 'threshold', 'tokens'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'malformed-inputs' as const)
    }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'cosine': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'damerauLevenshtein': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'jaccard': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'jaro': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'jaroWinkler': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'levenshtein': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'ngram': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'sorensenDice': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, ['cosine', 'damerauLevenshtein', 'jaccard', 'jaro', 'jaroWinkler', 'levenshtein', 'ngram', 'sorensenDice'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'cosine': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'comparison': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'key': SchemaNode.defineString({ 'type': 'string' } as const),
          'threshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'value': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['comparison', 'key', 'threshold', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'ngram': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'comparison': SchemaNode.defineString({ 'type': 'string' } as const),
          'size': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'threshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'value': SchemaNode.defineString({ 'type': 'string' } as const)
        }, ['comparison', 'size', 'threshold', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'text': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'comparison': SchemaNode.defineString({ 'type': 'string' } as const),
          'jaroComparison': SchemaNode.defineString({ 'type': 'string' } as const),
          'jaroThreshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'jaroValue': SchemaNode.defineString({ 'type': 'string' } as const),
          'jaroWinklerThreshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'threshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'transpositionComparison': SchemaNode.defineString({ 'type': 'string' } as const),
          'transpositionThreshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'transpositionValue': SchemaNode.defineString({ 'type': 'string' } as const),
          'value': SchemaNode.defineString({ 'type': 'string' } as const)
        }, ['comparison', 'jaroComparison', 'jaroThreshold', 'jaroValue', 'jaroWinklerThreshold', 'threshold', 'transpositionComparison', 'transpositionThreshold', 'transpositionValue', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'token': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'comparison': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'threshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'value': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
        }, ['comparison', 'threshold', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['cosine', 'ngram', 'text', 'token'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'valid-adapters' as const)
    }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
