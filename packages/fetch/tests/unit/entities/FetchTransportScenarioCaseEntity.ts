import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `FetchTransport.loop.spec.ts` scenario case shape. `input` is always empty; `operation` selects the transport path and which `expected` variant applies. */
export namespace FetchTransportScenarioCaseEntity {
  const operations = ['uses-native-fetch', 'uses-test-transport', 'uses-undici-fetch', 'uses-undici-fetch-null-dispatcher'] as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'oneOf': [
          {
            'additionalProperties': false,
            'properties': {
              'init': { 'additionalProperties': false, 'properties': { 'method': { 'minLength': 1, 'type': 'string' } }, 'required': ['method'], 'type': 'object' },
              'input': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['init', 'input'],
            'type': 'object'
          },
          { 'additionalProperties': false, 'properties': { 'responseBody': { 'minLength': 1, 'type': 'string' } }, 'required': ['responseBody'], 'type': 'object' }
        ]
      },
      'input': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' },
      'name': { 'minLength': 1, 'type': 'string' },
      'operation': { 'enum': operations }
    },
    'required': ['description', 'expected', 'input', 'name', 'operation'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineOneOf({}, [
        SchemaNode.defineObject({ 'type': 'object' } as const, {
            'init': SchemaNode.defineObject({ 'type': 'object' } as const, { 'method': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['method'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
            'input': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
          }, ['init', 'input'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        SchemaNode.defineObject({ 'type': 'object' } as const, { 'responseBody': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['responseBody'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      ] as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'operation': SchemaNode.defineEnum({}, operations)
    }, ['description', 'expected', 'input', 'name', 'operation'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
