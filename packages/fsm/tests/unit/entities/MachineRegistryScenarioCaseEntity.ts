import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

// duplicate-register-throws
const duplicateRegisterThrowsSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'type': 'string' } }, 'required': ['errorName'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'name': { 'type': 'string' } }, 'required': ['name'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'duplicate-register-throws' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const duplicateRegisterThrowsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineString({ 'type': 'string' } as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'duplicate-register-throws' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// has-check
const hasCheckSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'exists': { 'type': 'boolean' } }, 'required': ['exists'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'name': { 'type': 'string' }, 'registered': { 'type': 'boolean' } }, 'required': ['name', 'registered'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'has-check' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const hasCheckNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'exists': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['exists'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'registered': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['name', 'registered'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'has-check' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// instances-isolated
const instancesIsolatedSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'isolated': { 'type': 'boolean' } }, 'required': ['isolated'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'name': { 'type': 'string' } }, 'required': ['name'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'instances-isolated' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const instancesIsolatedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'isolated': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['isolated'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'instances-isolated' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// list-returns-all-registered
const listReturnsAllRegisteredSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'names': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['names'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'names': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['names'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'list-returns-all-registered' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const listReturnsAllRegisteredNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'names': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['names'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'names': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['names'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'list-returns-all-registered' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// register-get-roundtrip
const registerGetRoundtripSchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'sameInterpreter': { 'type': 'boolean' } }, 'required': ['sameInterpreter'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'name': { 'type': 'string' } }, 'required': ['name'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'register-get-roundtrip' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const registerGetRoundtripNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameInterpreter': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameInterpreter'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'register-get-roundtrip' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// unregister-removes-entry
const unregisterRemovesEntrySchema = { 'additionalProperties': false, 'properties': { 'description': { 'minLength': 1, 'type': 'string' }, 'expected': { 'additionalProperties': false, 'properties': { 'removed': { 'type': 'boolean' } }, 'required': ['removed'], 'type': 'object' }, 'input': { 'additionalProperties': false, 'properties': { 'name': { 'type': 'string' } }, 'required': ['name'], 'type': 'object' }, 'name': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'unregister-removes-entry' } }, 'required': ['description', 'expected', 'input', 'name', 'shape'], 'type': 'object' } as const;
const unregisterRemovesEntryNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'removed': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['removed'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst({}, 'unregister-removes-entry' as const) }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Every distinct `shape` value the spec exercises, discriminated by the `shape` const field. */
export namespace MachineRegistryScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      duplicateRegisterThrowsSchema,
      hasCheckSchema,
      instancesIsolatedSchema,
      listReturnsAllRegisteredSchema,
      registerGetRoundtripSchema,
      unregisterRemovesEntrySchema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    duplicateRegisterThrowsNode,
    hasCheckNode,
    instancesIsolatedNode,
    listReturnsAllRegisteredNode,
    registerGetRoundtripNode,
    unregisterRemovesEntryNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
