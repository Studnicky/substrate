/**
 * Compile-only negative fixture: each `@ts-expect-error` asserts a specific
 * assignment must fail. `tsc -b` (via `tsconfig.tests.json`) fails this file
 * if any expected error stops occurring — the brand's rejection is enforced
 * by the build, not by a runtime assertion (TypeScript has no runtime
 * concept of "this assignment should not compile").
 *
 * @module
 */
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';

const ageNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 120 } as const);
type AgeType = NodeStaticType<typeof ageNode>;

const percentNode = SchemaNode.defineNumber({ 'type': 'number', 'minimum': 0, 'maximum': 100 } as const);
type PercentType = NodeStaticType<typeof percentNode>;

const nameNode = SchemaNode.defineString({ 'type': 'string', 'minLength': 1 } as const);
type NameType = NodeStaticType<typeof nameNode>;
// @ts-expect-error plain string lacks the MinimumLengthBrandType<1> brand
const badName: NameType = 'plain string';
void badName;

// @ts-expect-error AgeType (maximum 120) is not assignable to PercentType (maximum 100)
const badPercent: PercentType = ageNode.schema.maximum as unknown as AgeType;
void badPercent;

const userNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': nameNode, 'age': ageNode }, ['name', 'age'] as const);
type UserType = NodeStaticType<typeof userNode>;
// @ts-expect-error 'age' is required and missing
const badUser: UserType = { 'name': 'x' as NameType };
void badUser;

// @ts-expect-error 'extra' is not a declared property and additionalProperties is closed
const badClosed: UserType = { 'name': 'x' as NameType, 'age': 5 as AgeType, 'extra': 1 };
void badClosed;

const emailNode = SchemaNode.defineString({ 'type': 'string', 'format': 'email' } as const);
const uuidNode = SchemaNode.defineString({ 'type': 'string', 'format': 'uuid' } as const);
type EmailType = NodeStaticType<typeof emailNode>;
type UuidType = NodeStaticType<typeof uuidNode>;
// @ts-expect-error FormatBrandType<'uuid'> is not assignable to FormatBrandType<'email'>
const badFormat: EmailType = 'x' as UuidType;
void badFormat;

const pairNode = SchemaNode.defineTuple({ 'type': 'array' } as const, [nameNode, ageNode] as const);
type PairType = NodeStaticType<typeof pairNode>;
// @ts-expect-error slot 0 is NameType, not AgeType
const badPair: PairType = [5 as AgeType, 5 as AgeType];
void badPair;
