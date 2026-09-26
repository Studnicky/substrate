import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SCENARIO_SHAPES = [
  'cidr-in-range',
  'range-date-boundary',
  'range-numeric-boundary',
  'range-string-case',
  'semver-compare-sign',
  'semver-satisfies',
  'strict-number'
] as const;

/** The scenario case shape `predicates-network-and-versioning.loop.spec.ts` exercises across seven predicate families. */
export namespace PredicatesNetworkAndVersioningScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'result': { 'oneOf': [{ 'type': 'boolean' }, { 'type': 'number' }, { 'type': 'null' }] },
          'sign': { 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'boundary': { 'enum': ['closed', 'half-open'] },
          'caseSensitive': { 'type': 'boolean' },
          'cidr': { 'type': 'string' },
          'first': { 'type': 'string' },
          'ip': { 'type': 'string' },
          'maximum': { 'oneOf': [{ 'type': 'string' }, { 'type': 'number' }] },
          'minimum': { 'oneOf': [{ 'type': 'string' }, { 'type': 'number' }] },
          'nan': { 'type': 'boolean' },
          'range': { 'type': 'string' },
          'second': { 'type': 'string' },
          'value': { 'oneOf': [{ 'type': 'string' }, { 'type': 'number' }, { 'type': 'boolean' }, { 'type': 'null' }] },
          'version': { 'type': 'string' }
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
          'result': SchemaNode.defineOneOf([
            SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            SchemaNode.defineNumber({ 'type': 'number' } as const),
            SchemaNode.defineNull({ 'type': 'null' } as const)
          ]),
          'sign': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'boundary': SchemaNode.defineEnum(['closed', 'half-open'] as const),
          'caseSensitive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'cidr': SchemaNode.defineString({ 'type': 'string' } as const),
          'first': SchemaNode.defineString({ 'type': 'string' } as const),
          'ip': SchemaNode.defineString({ 'type': 'string' } as const),
          'maximum': SchemaNode.defineOneOf([SchemaNode.defineString({ 'type': 'string' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const)]),
          'minimum': SchemaNode.defineOneOf([SchemaNode.defineString({ 'type': 'string' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const)]),
          'nan': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'range': SchemaNode.defineString({ 'type': 'string' } as const),
          'second': SchemaNode.defineString({ 'type': 'string' } as const),
          'value': SchemaNode.defineOneOf([
            SchemaNode.defineString({ 'type': 'string' } as const),
            SchemaNode.defineNumber({ 'type': 'number' } as const),
            SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            SchemaNode.defineNull({ 'type': 'null' } as const)
          ]),
          'version': SchemaNode.defineString({ 'type': 'string' } as const)
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
