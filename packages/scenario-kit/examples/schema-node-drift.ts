/** schema-node-drift — compileIntake calls NodeSchemaAgreement internally: a Schema/Node pair that disagree fails immediately, before any file is validated. Run: npx tsx packages/scenario-kit/examples/schema-node-drift.ts */

import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

// #region usage
import { ScenarioFileCompiler } from '../src/index.js';

// the entity's Node declares an 'age' property its Schema never mentions
namespace DriftedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'name': { 'minLength': 1, 'type': 'string' } },
    'required': ['name'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'age': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}

assert.throws(() => {
  ScenarioFileCompiler.compileIntake(DriftedEntity);
}, RuntimeError);
console.log('drifted Schema/Node pair: compileIntake rejects before compiling either side');
// #endregion usage

console.log('schema-node-drift: all assertions passed');
