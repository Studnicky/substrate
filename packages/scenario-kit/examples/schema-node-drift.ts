/** schema-node-drift — compileIntake calls NodeSchemaAgreement internally: a Schema/Node pair that disagree fails immediately, before any file is validated. Run: npx tsx packages/scenario-kit/examples/schema-node-drift.ts */

import { SchemaNode } from '@studnicky/entity/types';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

// #region usage
import { ScenarioFileCompiler } from '../src/index.js';

const schema = {
  'additionalProperties': false,
  'properties': { 'name': { 'minLength': 1, 'type': 'string' } },
  'required': ['name'],
  'type': 'object'
} as const;

// declares an 'age' property the schema above never mentions
const driftedNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'age': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
}, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });

assert.throws(() => {
  ScenarioFileCompiler.compileIntake(schema, driftedNode);
}, RuntimeError);
console.log('drifted Schema/Node pair: compileIntake rejects before compiling either side');
// #endregion usage

console.log('schema-node-drift: all assertions passed');
