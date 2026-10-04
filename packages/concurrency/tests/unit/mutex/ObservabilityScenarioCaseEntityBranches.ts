import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** Builds the scenario envelope around a shape-specific input and expected value. */
export class ObservabilityScenarioCaseEntityBranches {
  static scenarioSchema<
    const TShape extends string,
    TInputSchema extends Record<string, unknown>,
    TExpectedSchema extends Record<string, unknown>
  >(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': expectedSchema,
        'input': inputSchema,
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static scenarioNode<
    const TShape extends string,
    TInputNode extends SchemaNodeInterface<unknown, unknown>,
    TExpectedNode extends SchemaNodeInterface<unknown, unknown>
  >(
    shape: TShape,
    inputNode: TInputNode,
    expectedNode: TExpectedNode
  ): SchemaNodeInterface<
    unknown,
    {
      readonly 'description': string;
      readonly 'expected': NodeStaticType<TExpectedNode>;
      readonly 'input': NodeStaticType<TInputNode>;
      readonly 'name': string;
      readonly 'shape': TShape;
    },
    {
      readonly 'description': string;
      readonly 'expected': NodeInputType<TExpectedNode>;
      readonly 'input': NodeInputType<TInputNode>;
      readonly 'name': string;
      readonly 'shape': TShape;
    }
  > {
    const result = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': expectedNode,
        'input': inputNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    );
    return result;
  }
}
