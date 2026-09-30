import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../src/types/NodeStaticType.js';
import type { AssertType, IsAssignableType, RefuteType } from '../types/infer/type-level-assert.js';

import { EntityCompiler } from '../../../src/node/index.js';
import { SchemaIntakeError } from '../../../src/SchemaIntakeError.js';
import { SchemaNode } from '../../../src/types/infer/SchemaNode.js';

// One entity carrying a real constraint (minimum: 0), same shape as the
// MutexConfigEntity repro that surfaced this: create() must accept an
// unbranded literal on input and return a branded value on output.
const configNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumQueueSize': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['maximumQueueSize'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const configSchema = {
  'properties': { 'maximumQueueSize': { 'minimum': 0, 'type': 'integer' } },
  'required': ['maximumQueueSize'],
  'type': 'object'
} as const;

const create = EntityCompiler.compileCreate<NodeStaticType<typeof configNodeType>, NodeInputType<typeof configNodeType>>(configSchema);

void describe('EntityCreateFunctionInterface input/output split', () => {
  void it('type-checks the brand-split cases above (enforced by tsc -b)', () => {
    const checks: [
      // The input field is a plain, unbranded number — a literal like 0 inhabits it.
      AssertType<IsAssignableType<number, NodeInputType<typeof configNodeType>['maximumQueueSize']>>,
      // The static field still carries the minimum brand — a plain number does not inhabit it.
      RefuteType<IsAssignableType<number, NodeStaticType<typeof configNodeType>['maximumQueueSize']>>,
      // The input field is still genuinely `number`-typed, not `any` — a string does not inhabit it either.
      RefuteType<IsAssignableType<string, NodeInputType<typeof configNodeType>['maximumQueueSize']>>
    ] = [true, false, false];

    assert.equal(checks[0], true);
    assert.equal(checks[1], false);
    assert.equal(checks[2], false);
  });

  void it('accepts a bare unbranded literal and returns the branded static type', () => {
    const built: NodeStaticType<typeof configNodeType> = create({ 'maximumQueueSize': 0 });

    assert.equal(built.maximumQueueSize, 0);
  });

  void it('still rejects a value that violates the minimum constraint at runtime', () => {
    assert.throws(() => {
      const built = create({ 'maximumQueueSize': -1 });

      return built;
    }, SchemaIntakeError);
  });
});
