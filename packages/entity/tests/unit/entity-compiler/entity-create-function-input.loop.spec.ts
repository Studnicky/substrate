import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../src/types/NodeStaticType.js';
import { EntityCompiler } from '../../../src/node/index.js';
import { SchemaIntakeError } from '../../../src/SchemaIntakeError.js';
import { SchemaNode } from '../../../src/types/infer/SchemaNode.js';

type IsAssignableType<A, B> = A extends B ? true : false;
type ExpectTrueType<T extends true> = T;
type ExpectFalseType<T extends false> = T;

// One entity carrying a real constraint (minimum: 0), same shape as the
// MutexConfigEntity repro that surfaced this: create() must accept an
// unbranded literal on input and return a branded value on output.
const configNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'maximumQueueSize': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) },
  ['maximumQueueSize'] as const
);
const configSchema = {
  'properties': { 'maximumQueueSize': { 'minimum': 0, 'type': 'integer' } },
  'required': ['maximumQueueSize'],
  'type': 'object'
} as const;

type ConfigStaticType = NodeStaticType<typeof configNode>;
type ConfigInputType = NodeInputType<typeof configNode>;

// The input field is a plain, unbranded number — a literal like 0 inhabits it.
type InputAcceptsPlainNumberCheck = ExpectTrueType<IsAssignableType<number, ConfigInputType['maximumQueueSize']>>;
// The static field still carries the minimum brand — a plain number does not inhabit it.
type StaticRejectsPlainNumberCheck = ExpectFalseType<IsAssignableType<number, ConfigStaticType['maximumQueueSize']>>;
// The input field is still genuinely `number`-typed, not `any` — a string does not inhabit it either.
type InputRejectsStringCheck = ExpectFalseType<IsAssignableType<string, ConfigInputType['maximumQueueSize']>>;

const create = EntityCompiler.compileCreate<ConfigStaticType, ConfigInputType>(configSchema);

void describe('EntityCreateFunctionInterface input/output split', () => {
  void it('type-checks the brand-split cases above (enforced by tsc -b)', () => {
    const checks: [InputAcceptsPlainNumberCheck, StaticRejectsPlainNumberCheck, InputRejectsStringCheck] = [true, false, false];

    assert.equal(checks[0], true);
    assert.equal(checks[1], false);
    assert.equal(checks[2], false);
  });

  void it('accepts a bare unbranded literal and returns the branded static type', () => {
    const built: ConfigStaticType = create({ 'maximumQueueSize': 0 });

    assert.equal(built.maximumQueueSize, 0);
  });

  void it('still rejects a value that violates the minimum constraint at runtime', () => {
    assert.throws(() => create({ 'maximumQueueSize': -1 }), SchemaIntakeError);
  });
});
