/**
 * Compile-only negative fixture: each `AssertType<NotType<IsAssignableType<Bad, Target>>>`
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
import type { NodeStaticType } from '../../../../src/types/NodeStaticType.js';
import type { AssertType, IsAssignableType, NotType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

const ageNode = SchemaNode.defineNumber({ 'maximum': 120, 'minimum': 0, 'type': 'number' } as const);
const percentNodeType = SchemaNode.defineNumber({ 'maximum': 100, 'minimum': 0, 'type': 'number' } as const);
const nameNode = SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const);
const userNodeType = SchemaNode.defineObject({ 'type': 'object' } as const, { 'age': ageNode, 'name': nameNode }, ['name', 'age'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const emailNodeType = SchemaNode.defineString({ 'format': 'email', 'type': 'string' } as const);
const uuidNodeType = SchemaNode.defineString({ 'format': 'uuid', 'type': 'string' } as const);
const pairNodeType = SchemaNode.defineTuple({ 'type': 'array' } as const, [nameNode, ageNode] as const);

void describe('SchemaNode negative assignability', () => {
  void it('rejects the bad shapes above (enforced by tsc -b)', () => {
    const checks: [
      // A plain string lacks the MinimumLengthBrandType<1> brand the name type carries.
      AssertType<NotType<IsAssignableType<'plain string', NodeStaticType<typeof nameNode>>>>,
      // The age type's maximum brand differs from the percent type's, so it is not assignable.
      AssertType<NotType<IsAssignableType<NodeStaticType<typeof ageNode>, NodeStaticType<typeof percentNodeType>>>>,
      // 'age' is required on the user type but missing from this shape.
      AssertType<NotType<IsAssignableType<{ readonly 'name': NodeStaticType<typeof nameNode> }, NodeStaticType<typeof userNodeType>>>>,
      // 'extra' is not a declared property and additionalProperties is closed. Structural `extends`
      // permits width subtyping, so the excess key is detected directly rather than through
      // object-to-object assignability.
      AssertType<NotType<IsAssignableType<Exclude<keyof { readonly 'age': NodeStaticType<typeof ageNode>; readonly 'extra': number; readonly 'name': NodeStaticType<typeof nameNode>; }, keyof NodeStaticType<typeof userNodeType>>, never>>>,
      // FormatBrandType<'uuid'> is not assignable to FormatBrandType<'email'>.
      AssertType<NotType<IsAssignableType<NodeStaticType<typeof uuidNodeType>, NodeStaticType<typeof emailNodeType>>>>,
      // Slot 0 of the pair type is the name type, not the age type.
      AssertType<NotType<IsAssignableType<[NodeStaticType<typeof ageNode>, NodeStaticType<typeof ageNode>], NodeStaticType<typeof pairNodeType>>>>,
      // 'type' is a structural keyword, not an annotation keyword: defineAnnotated's own parameter
      // constraint (schema: TSchema & Record<Exclude<keyof TSchema, keyof AnnotationKeywordsInterface>,
      // never>) rejects it the same way the excess key above is rejected.
      AssertType<NotType<IsAssignableType<Exclude<keyof { readonly 'type': 'number' }, keyof AnnotationKeywordsInterface>, never>>>
    ] = [true, true, true, true, true, true, true];

    assert.deepEqual(checks, [true, true, true, true, true, true, true]);
  });
});
