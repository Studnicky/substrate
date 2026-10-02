import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SchemaNodeInterface } from '../../../../src/interfaces/SchemaNodeInterface.js';
import type { AssertType, EqualType } from './type-level-assert.js';

import { SchemaNode } from '../../../../src/types/infer/SchemaNode.js';

// Regression: `defineObject`'s declared schema type erased `properties`/`required`
// to `ObjectSchemaShapeInterface`'s generic `Record<string, unknown>` fallback, so
// `Node.schema.properties.x` always resolved to `unknown` for every entity and key.
const variantNode = SchemaNode.defineString({ 'enum': ['idle', 'running'], 'type': 'string' } as const);
const stateNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'variant': variantNode }, ['variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });

// A sibling entity can compose that property directly into its own node — the
// failure mode reported was `SchemaNodeInterface<unknown, unknown>` rejecting it.
const transitionNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'to': stateNode.schema.properties.variant }, ['to'] as const, { 'additionalProperties': false, 'patternProperties': {} });

void describe('SchemaNode.defineObject schema.properties/.required typing', () => {
  void it('type-checks the properties-composition case above (enforced by tsc -b)', () => {
    // `.schema.properties.variant` resolves to the exact node built for `variant`, not `unknown`.
    const check: AssertType<EqualType<typeof stateNode.schema.properties.variant, typeof variantNode>> = true;

    assert.ok(check);
  });

  void it('.schema.properties carries every declared property node, keyed by name', () => {
    // Compiles only if the declared properties structurally satisfy the keyed node record.
    const properties: Record<'variant', SchemaNodeInterface<unknown, unknown>> = stateNode.schema.properties;

    assert.deepEqual(properties.variant, variantNode);
  });

  void it('.schema.required carries the exact declared key union, not a bare string[]', () => {
    // Compiles only if the declared required keys satisfy the exact key union.
    const required: readonly 'variant'[] = stateNode.schema.required;

    assert.deepEqual(required, ['variant']);
  });

  void it('a sibling entity composing .schema.properties.x builds and reads back correctly', () => {
    assert.deepEqual(transitionNode.schema.properties.to, variantNode);
  });
});
