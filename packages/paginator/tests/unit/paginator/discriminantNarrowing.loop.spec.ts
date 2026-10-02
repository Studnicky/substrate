/**
 * Discriminant-narrowing regression guard.
 *
 * The `describe*` helpers below read payload fields ONLY after narrowing each public variant
 * union, and they stay in this file rather than moving into scenario data on purpose: the
 * package type-check compiles them under strict mode, so broadening any discriminator fails
 * `tsc` before a single assertion runs. The scenario fixture supplies the inputs and expected
 * descriptions; the compile-time guarantee lives here.
 */
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  PaginatorExhaustedCursorEntity,
  PaginatorIdleStateEntity,
  PaginatorResetEventEntity
} from '../../../src/entities/index.js';
import type {
  PaginatorAvailableCursorInterface,
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorPageReceivedEventInterface
} from '../../../src/interfaces/index.js';

import {
  PaginatorAvailableCursorEntity,
  PaginatorExhaustedStateEntity,
  PaginatorHasMoreStateEntity,
  PaginatorPageReceivedEventEntity
} from '../../../src/entities/index.js';
import { DiscriminantNarrowingScenarioCaseEntity } from '../entities/DiscriminantNarrowingScenarioCaseEntity.js';
import scenarioGroups from './discriminantNarrowing.scenarios.json' with { 'type': 'json' };

class DiscriminantNarrowingRunners {
  static 'cursor-discriminants'(scenarioCase: ScenarioCaseOfType<DiscriminantNarrowingScenarioCaseEntity.Type, 'cursor-discriminants'>): void {
    const descriptions: string[] = [];
    for (let index = 0; index < scenarioCase.input.cursors.length; index += 1) {
      const cursor = scenarioCase.input.cursors[index];
      if (cursor !== undefined) {
        descriptions.push(DiscriminantNarrowingRunners.describeCursor(cursor));
      }
    }
    assert.deepStrictEqual(descriptions, scenarioCase.expected.descriptions);
  }

  static 'event-discriminants'(scenarioCase: ScenarioCaseOfType<DiscriminantNarrowingScenarioCaseEntity.Type, 'event-discriminants'>): void {
    const descriptions: string[] = [];
    for (let index = 0; index < scenarioCase.input.events.length; index += 1) {
      const event = scenarioCase.input.events[index];
      if (event !== undefined) {
        descriptions.push(DiscriminantNarrowingRunners.describeEvent(event));
      }
    }
    assert.deepStrictEqual(descriptions, scenarioCase.expected.descriptions);
  }

  static 'state-discriminants'(scenarioCase: ScenarioCaseOfType<DiscriminantNarrowingScenarioCaseEntity.Type, 'state-discriminants'>): void {
    const descriptions: string[] = [];
    for (let index = 0; index < scenarioCase.input.states.length; index += 1) {
      const state = scenarioCase.input.states[index];
      if (state !== undefined) {
        descriptions.push(DiscriminantNarrowingRunners.describeState(state));
      }
    }
    assert.deepStrictEqual(descriptions, scenarioCase.expected.descriptions);
  }

  static declaresEntityContracts(): void {
    void describe('Paginator entity contracts', () => {
      void it('intakes complete cursor, state, and page-received event shapes', () => {
        assert.deepEqual(
          PaginatorAvailableCursorEntity.intake({ 'cursor': 2, 'exhausted': false }),
          { 'cursor': 2, 'exhausted': false }
        );
        assert.deepEqual(
          PaginatorHasMoreStateEntity.intake({ 'cursor': 2, 'pages': ['first'], 'variant': 'hasMore' }),
          { 'cursor': 2, 'pages': ['first'], 'variant': 'hasMore' }
        );
        assert.deepEqual(
          PaginatorExhaustedStateEntity.intake({ 'pages': ['last'], 'variant': 'exhausted' }),
          { 'pages': ['last'], 'variant': 'exhausted' }
        );
        assert.deepEqual(
          PaginatorPageReceivedEventEntity.intake({
            'nextCursor': { 'exhausted': true },
            'page': 'last',
            'type': 'pageReceived'
          }),
          { 'nextCursor': { 'exhausted': true }, 'page': 'last', 'type': 'pageReceived' }
        );
      });

      void it('rejects incomplete page-received event data', () => {
        assert.throws(() => {
          PaginatorPageReceivedEventEntity.intake({
            'nextCursor': { 'exhausted': false },
            'page': 'missing cursor',
            'type': 'pageReceived'
          });
        });
      });
    });
  }

  private static describeCursor(cursor: PaginatorAvailableCursorInterface<number> | PaginatorExhaustedCursorEntity.Type): string {
    const result = cursor.exhausted ? 'exhausted' : `cursor:${String(cursor.cursor)}`;

    return result;
  }

  private static describeEvent(event: PaginatorPageReceivedEventInterface<string, number> | PaginatorResetEventEntity.Type): string {
    if (event.type === 'reset') {
      return event.type;
    }

    const result = `${event.page}:${DiscriminantNarrowingRunners.describeCursor(event.nextCursor)}`;

    return result;
  }

  private static describeState(
    state: PaginatorExhaustedStateInterface<string> | PaginatorHasMoreStateInterface<string, number> | PaginatorIdleStateEntity.Type
  ): string {
    if (state.variant === 'exhausted') {
      return `${state.pages.join(',')}:exhausted`;
    }

    if (state.variant === 'hasMore') {
      return `${state.pages.join(',')}:cursor:${String(state.cursor)}`;
    }

    return state.variant;
  }
}

ScenarioSuite.register({
  'entity': DiscriminantNarrowingScenarioCaseEntity,
  'extraTests': DiscriminantNarrowingRunners.declaresEntityContracts,
  'file': scenarioGroups,
  'name': 'Paginator discriminant narrowing',
  'runners': DiscriminantNarrowingRunners
});
