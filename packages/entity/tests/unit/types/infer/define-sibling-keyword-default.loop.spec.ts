import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeInputType } from '../../../../src/types/NodeInputType.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

type IsAssignableType<A, B> = A extends B ? true : false;
type ExpectTrueType<T extends true> = T;
type ExpectFalseType<T extends false> = T;
// `{} extends Pick<T, K>` is true exactly when `K` is optional on `T` — reliable
// regardless of `T[K]`'s own value type, unlike an `undefined`-assignability check
// (which false-negatives against a value type of `unknown`, e.g. `defineNot`).
type IsOptionalKeyType<T, K extends keyof T> = Record<never, never> extends Pick<T, K> ? true : false;

// A `default`-bearing sibling-keyword property must derive PRESENT (required) on
// the static type and OPTIONAL on the input type — the same asymmetry
// `InferDefaultBearingKeysType` already gives a `default`-bearing object property.
const optionsNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'allOf': SchemaNode.defineAllOf({ 'default': 0 } as const, [SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)] as const),
    'anyOf': SchemaNode.defineAnyOf({ 'default': 'fast' } as const, [SchemaNode.defineConst('fast' as const), SchemaNode.defineConst('slow' as const)] as const),
    'const': SchemaNode.defineConst({ 'default': 'ready' } as const, 'ready' as const),
    'mode': SchemaNode.defineEnum({ 'default': 'structural' } as const, ['any', 'structural', 'typed'] as const),
    'not': SchemaNode.defineNot({ 'default': 0 } as const, SchemaNode.defineConst(0 as const)),
    'oneOf': SchemaNode.defineOneOf({ 'default': null } as const, [SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)] as const)
  },
  [] as const
);

type OptionsStaticType = NodeStaticType<typeof optionsNode>;
type OptionsInputType = NodeInputType<typeof optionsNode>;

type ModeRequiredOnStaticCheck = ExpectFalseType<IsOptionalKeyType<OptionsStaticType, 'mode'>>;
type AllOfRequiredOnStaticCheck = ExpectFalseType<IsOptionalKeyType<OptionsStaticType, 'allOf'>>;
type AnyOfRequiredOnStaticCheck = ExpectFalseType<IsOptionalKeyType<OptionsStaticType, 'anyOf'>>;
type ConstRequiredOnStaticCheck = ExpectFalseType<IsOptionalKeyType<OptionsStaticType, 'const'>>;
type NotRequiredOnStaticCheck = ExpectFalseType<IsOptionalKeyType<OptionsStaticType, 'not'>>;
type OneOfRequiredOnStaticCheck = ExpectFalseType<IsOptionalKeyType<OptionsStaticType, 'oneOf'>>;

type ModeOptionalOnInputCheck = ExpectTrueType<IsOptionalKeyType<OptionsInputType, 'mode'>>;
type AllOfOptionalOnInputCheck = ExpectTrueType<IsOptionalKeyType<OptionsInputType, 'allOf'>>;
type AnyOfOptionalOnInputCheck = ExpectTrueType<IsOptionalKeyType<OptionsInputType, 'anyOf'>>;
type ConstOptionalOnInputCheck = ExpectTrueType<IsOptionalKeyType<OptionsInputType, 'const'>>;
type NotOptionalOnInputCheck = ExpectTrueType<IsOptionalKeyType<OptionsInputType, 'not'>>;
type OneOfOptionalOnInputCheck = ExpectTrueType<IsOptionalKeyType<OptionsInputType, 'oneOf'>>;

// The sibling `default` composes rather than replaces — the hard-coded keyword still derives.
// `A extends B` distributes when `A` is a naked union; putting the (possibly-wrapped) derived
// type in `A` and the concrete expected union in `B` keeps this a single non-distributed check.
type ModeStillEnumCheck = ExpectTrueType<IsAssignableType<OptionsStaticType['mode'], 'any' | 'structural' | 'typed'>>;
type OneOfStillUnionCheck = ExpectTrueType<IsAssignableType<OptionsStaticType['oneOf'], number | null>>;

// A schema with no `default` keeps the property required-only on both sides (unchanged behavior).
const noDefaultNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'mode': SchemaNode.defineEnum(['any', 'structural'] as const) },
  ['mode'] as const
);
type NoDefaultStaticType = NodeStaticType<typeof noDefaultNode>;
type NoDefaultInputType = NodeInputType<typeof noDefaultNode>;
type NoDefaultModeRequiredOnStaticCheck = ExpectFalseType<IsOptionalKeyType<NoDefaultStaticType, 'mode'>>;
type NoDefaultModeRequiredOnInputCheck = ExpectFalseType<IsOptionalKeyType<NoDefaultInputType, 'mode'>>;

void describe('SchemaNode sibling-keyword default composition', () => {
  void it('type-checks the present/optional split above (enforced by tsc -b)', () => {
    const checks: [
      ModeRequiredOnStaticCheck, AllOfRequiredOnStaticCheck, AnyOfRequiredOnStaticCheck, ConstRequiredOnStaticCheck,
      NotRequiredOnStaticCheck, OneOfRequiredOnStaticCheck, ModeOptionalOnInputCheck, AllOfOptionalOnInputCheck,
      AnyOfOptionalOnInputCheck, ConstOptionalOnInputCheck, NotOptionalOnInputCheck, OneOfOptionalOnInputCheck,
      ModeStillEnumCheck, OneOfStillUnionCheck, NoDefaultModeRequiredOnStaticCheck, NoDefaultModeRequiredOnInputCheck
    ] = [false, false, false, false, false, false, true, true, true, true, true, true, true, true, false, false];

    assert.deepEqual(checks, [false, false, false, false, false, false, true, true, true, true, true, true, true, true, false, false]);
  });

  void it('still accepts the pre-existing single-argument call shape', () => {
    const legacyNode = SchemaNode.defineEnum(['left', 'right'] as const);

    assert.deepEqual(legacyNode.schema, { 'enum': ['left', 'right'] });
  });

  void it('merges the sibling schema literal into the runtime schema for the two-argument call shape', () => {
    const decoratedNode = SchemaNode.defineEnum({ 'default': 'left' } as const, ['left', 'right'] as const);

    assert.deepEqual(decoratedNode.schema, { 'default': 'left', 'enum': ['left', 'right'] });
  });
});

