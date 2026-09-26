import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SchemaNodeInterface } from '../../../../src/interfaces/SchemaNodeInterface.js';
import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

type EqualType<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type ExpectTrueType<T extends true> = T;

/** Compiles only if `value` structurally satisfies `T` — the type-level half of each case below. */
function assertAssignable<T>(value: T): void {
  void value;
}

// Regression: `defineObject`'s declared schema type erased `properties`/`required`
// to `ObjectSchemaShapeInterface`'s generic `Record<string, unknown>` fallback, so
// `Node.schema.properties.x` always resolved to `unknown` for every entity and key.
const variantNode = SchemaNode.defineString({ 'type': 'string', 'enum': ['idle', 'running'] } as const);
const stateNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'variant': variantNode }, ['variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// `.schema.properties.variant` resolves to the exact node built for `variant`, not `unknown`.
type SchemaPropertiesVariantCheck = ExpectTrueType<EqualType<typeof stateNode.schema.properties.variant, typeof variantNode>>;

// A sibling entity can compose that property directly into its own node — the
// failure mode reported was `SchemaNodeInterface<unknown, unknown>` rejecting it.
const transitionNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'to': stateNode.schema.properties.variant }, ['to'] as const, { 'additionalProperties': false, 'patternProperties': {} });

void describe('SchemaNode.defineObject schema.properties/.required typing', () => {
  void it('type-checks the properties-composition case above (enforced by tsc -b)', () => {
    const check: SchemaPropertiesVariantCheck = true;

    assert.ok(check);
  });

  void it('.schema.properties carries every declared property node, keyed by name', () => {
    assertAssignable<Record<'variant', SchemaNodeInterface<unknown, unknown>>>(stateNode.schema.properties);
    assert.deepEqual(stateNode.schema.properties.variant, variantNode);
  });

  void it('.schema.required carries the exact declared key union, not a bare string[]', () => {
    assertAssignable<readonly 'variant'[]>(stateNode.schema.required);
    assert.deepEqual(stateNode.schema.required, ['variant']);
  });

  void it('a sibling entity composing .schema.properties.x builds and reads back correctly', () => {
    assert.deepEqual(transitionNode.schema.properties.to, variantNode);
  });
});
