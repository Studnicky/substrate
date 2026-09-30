import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const descriptionSchema = { 'minLength': 1, 'type': 'string' } as const;
const descriptionNode = SchemaNode.defineString(descriptionSchema);

/** Builds the `{ description, expected, input, name, shape }` envelope every branch shares, varying only the discriminant and the two payloads. */
class ScenarioBranchBuilders {
  static branchSchema<
    const TShape extends string,
    const TInputSchema extends Record<string, unknown>,
    const TExpectedSchema extends Record<string, unknown>
  >(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': descriptionSchema,
        'expected': expectedSchema,
        'input': inputSchema,
        'name': descriptionSchema,
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<
    const TShape extends string,
    TInputNode extends SchemaNodeInterface<unknown, unknown>,
    TExpectedNode extends SchemaNodeInterface<unknown, unknown>
  >(shape: TShape, inputNode: TInputNode, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': descriptionNode,
      'expected': expectedNode,
      'input': inputNode,
      'name': descriptionNode,
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

// cidr-in-range
const branch1Schema = ScenarioBranchBuilders.branchSchema('cidr-in-range', { 'additionalProperties': false, 'properties': { 'cidr': { 'type': 'string' }, 'ip': { 'type': 'string' } }, 'required': ['cidr', 'ip'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'result': { 'type': 'boolean' } }, 'required': ['result'], 'type': 'object' });
const branch1Node = ScenarioBranchBuilders.branchNode('cidr-in-range', SchemaNode.defineObject({ 'type': 'object' } as const, { 'cidr': SchemaNode.defineString({ 'type': 'string' } as const), 'ip': SchemaNode.defineString({ 'type': 'string' } as const) }, ['cidr', 'ip'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// range-date-boundary
const branch2Schema = ScenarioBranchBuilders.branchSchema('range-date-boundary', { 'additionalProperties': false, 'properties': { 'boundary': { 'type': 'string' }, 'maximum': { 'type': 'string' }, 'minimum': { 'type': 'string' }, 'value': { 'type': 'string' } }, 'required': ['boundary', 'maximum', 'minimum', 'value'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'result': { 'type': 'boolean' } }, 'required': ['result'], 'type': 'object' });
const branch2Node = ScenarioBranchBuilders.branchNode('range-date-boundary', SchemaNode.defineObject({ 'type': 'object' } as const, { 'boundary': SchemaNode.defineString({ 'type': 'string' } as const), 'maximum': SchemaNode.defineString({ 'type': 'string' } as const), 'minimum': SchemaNode.defineString({ 'type': 'string' } as const), 'value': SchemaNode.defineString({ 'type': 'string' } as const) }, ['boundary', 'maximum', 'minimum', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// range-numeric-boundary
const branch3Schema = ScenarioBranchBuilders.branchSchema('range-numeric-boundary', { 'additionalProperties': false, 'properties': { 'boundary': { 'type': 'string' }, 'maximum': { 'type': 'number' }, 'minimum': { 'type': 'number' }, 'value': { 'type': 'number' } }, 'required': ['maximum', 'minimum', 'value'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'result': { 'type': 'boolean' } }, 'required': ['result'], 'type': 'object' });
const branch3Node = ScenarioBranchBuilders.branchNode('range-numeric-boundary', SchemaNode.defineObject({ 'type': 'object' } as const, { 'boundary': SchemaNode.defineString({ 'type': 'string' } as const), 'maximum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximum', 'minimum', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// range-string-case
const branch4Schema = ScenarioBranchBuilders.branchSchema('range-string-case', { 'additionalProperties': false, 'properties': { 'caseSensitive': { 'type': 'boolean' }, 'maximum': { 'type': 'string' }, 'minimum': { 'type': 'string' }, 'value': { 'type': 'string' } }, 'required': ['maximum', 'minimum', 'value'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'result': { 'type': 'boolean' } }, 'required': ['result'], 'type': 'object' });
const branch4Node = ScenarioBranchBuilders.branchNode('range-string-case', SchemaNode.defineObject({ 'type': 'object' } as const, { 'caseSensitive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'maximum': SchemaNode.defineString({ 'type': 'string' } as const), 'minimum': SchemaNode.defineString({ 'type': 'string' } as const), 'value': SchemaNode.defineString({ 'type': 'string' } as const) }, ['maximum', 'minimum', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// semver-compare-sign
const branch5Schema = ScenarioBranchBuilders.branchSchema('semver-compare-sign', { 'additionalProperties': false, 'properties': { 'first': { 'type': 'string' }, 'second': { 'type': 'string' } }, 'required': ['first', 'second'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'sign': { 'type': 'number' } }, 'required': ['sign'], 'type': 'object' });
const branch5Node = ScenarioBranchBuilders.branchNode('semver-compare-sign', SchemaNode.defineObject({ 'type': 'object' } as const, { 'first': SchemaNode.defineString({ 'type': 'string' } as const), 'second': SchemaNode.defineString({ 'type': 'string' } as const) }, ['first', 'second'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'sign': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['sign'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// semver-satisfies
const branch6Schema = ScenarioBranchBuilders.branchSchema('semver-satisfies', { 'additionalProperties': false, 'properties': { 'range': { 'type': 'string' }, 'version': { 'type': 'string' } }, 'required': ['range', 'version'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'result': { 'type': 'boolean' } }, 'required': ['result'], 'type': 'object' });
const branch6Node = ScenarioBranchBuilders.branchNode('semver-satisfies', SchemaNode.defineObject({ 'type': 'object' } as const, { 'range': SchemaNode.defineString({ 'type': 'string' } as const), 'version': SchemaNode.defineString({ 'type': 'string' } as const) }, ['range', 'version'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

// strict-number
const branch7Schema = ScenarioBranchBuilders.branchSchema('strict-number', { 'additionalProperties': false, 'properties': { 'nan': { 'type': 'boolean' }, 'value': { 'oneOf': [{ 'type': 'boolean' }, { 'type': 'null' }, { 'type': 'number' }, { 'type': 'string' }] } }, 'required': ['value'], 'type': 'object' }, { 'additionalProperties': false, 'properties': { 'result': { 'oneOf': [{ 'type': 'null' }, { 'type': 'number' }] } }, 'required': ['result'], 'type': 'object' });
const branch7Node = ScenarioBranchBuilders.branchNode('strict-number', SchemaNode.defineObject({ 'type': 'object' } as const, { 'nan': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineOneOf({}, [SchemaNode.defineBoolean({ 'type': 'boolean' } as const), SchemaNode.defineNull({ 'type': 'null' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)] as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineOneOf({}, [SchemaNode.defineNull({ 'type': 'null' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const)] as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }));

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace PredicatesNetworkAndVersioningScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      branch1Schema,
      branch2Schema,
      branch3Schema,
      branch4Schema,
      branch5Schema,
      branch6Schema,
      branch7Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    branch1Node,
    branch2Node,
    branch3Node,
    branch4Node,
    branch5Node,
    branch6Node,
    branch7Node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
