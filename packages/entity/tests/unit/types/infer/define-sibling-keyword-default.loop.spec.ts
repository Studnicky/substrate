import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { AssertType, IsAssignableType, IsOptionalKeyType, RefuteType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

// A `default`-bearing sibling-keyword property must derive PRESENT (required) on
// the static type and OPTIONAL on the input type — the same asymmetry
// `InferDefaultBearingKeysType` already gives a `default`-bearing object property.
const optionsNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'allOf': SchemaNode.defineAllOf({ 'default': 0 } as const, [SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)] as const),
  'anyOf': SchemaNode.defineAnyOf({ 'default': 'fast' } as const, [SchemaNode.defineConst({}, 'fast' as const), SchemaNode.defineConst({}, 'slow' as const)] as const),
  'const': SchemaNode.defineConst({ 'default': 'ready' } as const, 'ready' as const),
  'mode': SchemaNode.defineEnum({ 'default': 'structural' } as const, ['any', 'structural', 'typed'] as const),
  'not': SchemaNode.defineNot({ 'default': 0 } as const, SchemaNode.defineConst({}, 0 as const)),
  'oneOf': SchemaNode.defineOneOf({ 'default': null } as const, [SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)] as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

// A schema with no `default` keeps the property required-only on both sides (unchanged behavior).
const noDefaultNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, { 'mode': SchemaNode.defineEnum({}, ['any', 'structural'] as const) }, ['mode'] as const, { 'additionalProperties': false, 'patternProperties': {} });

void describe('SchemaNode sibling-keyword default composition', () => {
  void it('type-checks the present/optional split above (enforced by tsc -b)', () => {
    // `{} extends Pick<T, K>` is true exactly when `K` is optional on `T` — reliable
    // regardless of `T[K]`'s own value type, unlike an `undefined`-assignability check
    // (which false-negatives against a value type of `unknown`, e.g. `defineNot`).
    // The sibling `default` composes rather than replaces — the hard-coded keyword still derives.
    // `A extends B` distributes when `A` is a naked union; putting the (possibly-wrapped) derived
    // type in `A` and the concrete expected union in `B` keeps this a single non-distributed check.
    const checks: [
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof optionsNodeType>, 'mode'>>,
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof optionsNodeType>, 'allOf'>>,
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof optionsNodeType>, 'anyOf'>>,
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof optionsNodeType>, 'const'>>,
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof optionsNodeType>, 'not'>>,
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof optionsNodeType>, 'oneOf'>>,
      AssertType<IsOptionalKeyType<NodeInputType<typeof optionsNodeType>, 'mode'>>,
      AssertType<IsOptionalKeyType<NodeInputType<typeof optionsNodeType>, 'allOf'>>,
      AssertType<IsOptionalKeyType<NodeInputType<typeof optionsNodeType>, 'anyOf'>>,
      AssertType<IsOptionalKeyType<NodeInputType<typeof optionsNodeType>, 'const'>>,
      AssertType<IsOptionalKeyType<NodeInputType<typeof optionsNodeType>, 'not'>>,
      AssertType<IsOptionalKeyType<NodeInputType<typeof optionsNodeType>, 'oneOf'>>,
      AssertType<IsAssignableType<NodeStaticType<typeof optionsNodeType>['mode'], 'any' | 'structural' | 'typed'>>,
      AssertType<IsAssignableType<NodeStaticType<typeof optionsNodeType>['oneOf'], number | null>>,
      RefuteType<IsOptionalKeyType<NodeStaticType<typeof noDefaultNodeType>, 'mode'>>,
      RefuteType<IsOptionalKeyType<NodeInputType<typeof noDefaultNodeType>, 'mode'>>
    ] = [false, false, false, false, false, false, true, true, true, true, true, true, true, true, false, false];

    assert.deepEqual(checks, [false, false, false, false, false, false, true, true, true, true, true, true, true, true, false, false]);
  });

  void it('still accepts the pre-existing single-argument call shape', () => {
    const legacyNode = SchemaNode.defineEnum({}, ['left', 'right'] as const);

    assert.deepEqual(legacyNode.schema, { 'enum': ['left', 'right'] });
  });

  void it('merges the sibling schema literal into the runtime schema for the two-argument call shape', () => {
    const decoratedNode = SchemaNode.defineEnum({ 'default': 'left' } as const, ['left', 'right'] as const);

    assert.deepEqual(decoratedNode.schema, { 'default': 'left', 'enum': ['left', 'right'] });
  });
});
