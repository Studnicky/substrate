/** basic-usage — compileIntake validates a { cases: [...] } envelope against a caller-supplied case entity; the returned type is inferred from the Node, never passed explicitly. Run: npx tsx packages/scenario-kit/examples/basic-usage.ts */

import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';
import assert from 'node:assert/strict';

// #region usage
import { ScenarioFileCompiler } from '../src/index.js';

namespace SumCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'sum': { 'type': 'number' } },
        'required': ['sum'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'a': { 'type': 'number' }, 'b': { 'type': 'number' } },
        'required': ['a', 'b'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['description', 'expected', 'input', 'name'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'sum': SchemaNode.defineNumber({ 'type': 'number' } as const) },
        ['sum'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'a': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'b': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['a', 'b'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    },
    ['description', 'expected', 'input', 'name'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}

const intakeSumFile = ScenarioFileCompiler.compileIntake(SumCaseEntity.Schema, SumCaseEntity.Node);

const parsed = intakeSumFile({
  'cases': [
    { 'description': 'one plus two', 'expected': { 'sum': 3 }, 'input': { 'a': 1, 'b': 2 }, 'name': 'one-plus-two' },
    { 'description': 'two plus two', 'expected': { 'sum': 4 }, 'input': { 'a': 2, 'b': 2 }, 'name': 'two-plus-two' }
  ]
});

const totalSum = parsed.cases.reduce((total, scenarioCase) => {
  const nextTotal = total + scenarioCase.expected.sum;
  return nextTotal;
}, 0);
console.log(`intake produced ${parsed.cases.length} case(s), totalSum=${totalSum}`);
// #endregion usage

assert.equal(parsed.cases.length, 2);
assert.equal(totalSum, 7);
console.log('basic-usage: all assertions passed');
