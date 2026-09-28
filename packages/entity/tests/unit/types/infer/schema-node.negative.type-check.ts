/**
 * Compile-only negative fixture: each `Assert<Not<IsAssignable<Bad, Target>>>`
 * check is a type-level fact that a specific bad shape is not assignable to
 * a specific branded/derived type. `tsc -b` (via `tsconfig.tests.json`) fails
 * this file if any check stops holding — the brand's rejection is enforced
 * by the type checker itself, not by a runtime assertion (TypeScript has no
 * runtime concept of "this assignment should not compile").
 *
 * @module
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AnnotationKeywordsInterface } from '../../../../src/interfaces/AnnotationKeywordsInterface.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';

import { Assert, IsAssignable, Not } from './type-level-assert.js';

const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);
type AgeType = NodeStaticType<typeof ageNode>;

const percentNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 100 } as const);
type PercentType = NodeStaticType<typeof percentNode>;

const nameNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1 } as const);
type NameType = NodeStaticType<typeof nameNode>;

// A plain string lacks the MinimumLengthBrandType<1> brand NameType carries.
type BadNameCheck = Assert<Not<IsAssignable<'plain string', NameType>>>;

// AgeType's maximum brand differs from PercentType's, so it is not assignable.
type BadPercentCheck = Assert<Not<IsAssignable<AgeType, PercentType>>>;

const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode, 'age': ageNode }, ['name', 'age'] as const, { 'additionalProperties': false, 'patternProperties': {} });
type UserType = NodeStaticType<typeof userNode>;

// 'age' is required on UserType but missing from this shape.
type BadUserMissingAge = { readonly 'name': NameType };
type BadUserCheck = Assert<Not<IsAssignable<BadUserMissingAge, UserType>>>;

// 'extra' is not a declared property and additionalProperties is closed. Structural `extends`
// permits width subtyping, so the excess key is detected directly rather than through
// object-to-object assignability.
type BadUserExtraProp = { readonly 'name': NameType; readonly 'age': AgeType; readonly 'extra': number };
type BadClosedCheck = Assert<Not<IsAssignable<Exclude<keyof BadUserExtraProp, keyof UserType>, never>>>;

const emailNode = SchemaNode.defineString({ 'type': 'string', 'format': 'email' } as const);
const uuidNode = SchemaNode.defineString({ 'type': 'string', 'format': 'uuid' } as const);
type EmailType = NodeStaticType<typeof emailNode>;
type UuidType = NodeStaticType<typeof uuidNode>;

// FormatBrandType<'uuid'> is not assignable to FormatBrandType<'email'>.
type BadFormatCheck = Assert<Not<IsAssignable<UuidType, EmailType>>>;

const pairNode = SchemaNode.defineTuple({ 'type': 'array' } as const, [nameNode, ageNode] as const);
type PairType = NodeStaticType<typeof pairNode>;

// Slot 0 of PairType is NameType, not AgeType.
type BadPairSlot0Age = [AgeType, AgeType];
type BadPairCheck = Assert<Not<IsAssignable<BadPairSlot0Age, PairType>>>;

// 'type' is a structural keyword, not an annotation keyword: defineAnnotated's own parameter
// constraint (schema: TSchema & Record<Exclude<keyof TSchema, keyof AnnotationKeywordsInterface>,
// never>) rejects it the same way BadClosedCheck's excess key is rejected above.
type BadAnnotationSchema = { readonly 'type': 'number' };
type BadAnnotationCheck = Assert<Not<IsAssignable<Exclude<keyof BadAnnotationSchema, keyof AnnotationKeywordsInterface>, never>>>;

void describe('SchemaNode negative assignability', () => {
  void it('rejects the bad shapes above (enforced by tsc -b)', () => {
    const checks: [
      BadNameCheck, BadPercentCheck, BadUserCheck, BadClosedCheck, BadFormatCheck, BadPairCheck, BadAnnotationCheck
    ] = [true, true, true, true, true, true, true];

    assert.deepEqual(checks, [true, true, true, true, true, true, true]);
  });
});
