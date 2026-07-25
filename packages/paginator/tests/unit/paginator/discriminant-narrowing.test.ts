/**
 * Paginator Discriminant Narrowing Regression Tests
 *
 * These helpers intentionally read payload fields only after narrowing each
 * public variant union. The package type-check script compiles this file under
 * strict mode, so broadening any discriminator loses the property access
 * guarantees before the behavioral assertions can run.
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import type {
  PaginatorAvailableCursorInterface,
  PaginatorExhaustedCursorEntity,
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorIdleStateEntity,
  PaginatorPageReceivedEventInterface,
  PaginatorResetEventEntity
} from '../../../src/index.js';

function describeCursor(
  cursor: PaginatorAvailableCursorInterface<number> | PaginatorExhaustedCursorEntity.Type
): string {
  return cursor.exhausted ? 'exhausted' : `cursor:${String(cursor.cursor)}`;
}

function describeEvent(
  event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
): string {
  if (event.type === 'reset') {
    return event.type;
  }

  return `${event.page}:${describeCursor(event.nextCursor)}`;
}

function describeState(
  state: PaginatorIdleStateEntity.Type
  | PaginatorHasMoreStateInterface<string, number>
  | PaginatorExhaustedStateInterface<string>
): string {
  switch (state.variant) {
    case 'idle':
      return state.variant;
    case 'hasMore':
      return `${state.pages.join(',')}:cursor:${String(state.cursor)}`;
    case 'exhausted':
      return `${state.pages.join(',')}:exhausted`;
  }
}

it('narrows state, event, and cursor payloads by their discriminants', () => {
  strictEqual(describeCursor({ 'cursor': 2, 'exhausted': false }), 'cursor:2');
  strictEqual(describeCursor({ 'exhausted': true }), 'exhausted');
  strictEqual(describeEvent({ 'type': 'reset' }), 'reset');
  strictEqual(
    describeEvent({ 'nextCursor': { 'cursor': 2, 'exhausted': false }, 'page': 'page-1', 'type': 'pageReceived' }),
    'page-1:cursor:2'
  );
  strictEqual(describeState({ 'variant': 'idle' }), 'idle');
  strictEqual(describeState({ 'cursor': 2, 'pages': ['page-1'], 'variant': 'hasMore' }), 'page-1:cursor:2');
  strictEqual(describeState({ 'pages': ['page-1'], 'variant': 'exhausted' }), 'page-1:exhausted');
});
