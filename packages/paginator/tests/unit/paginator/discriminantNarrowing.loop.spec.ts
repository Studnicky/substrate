/**
 * Discriminant-narrowing regression guard.
 *
 * The `describe*` helpers below read payload fields ONLY after narrowing each public variant
 * union, and they stay in this file rather than moving into scenario data on purpose: the
 * package type-check compiles them under strict mode, so broadening any discriminator fails
 * `tsc` before a single assertion runs. The scenario fixture supplies the inputs and expected
 * descriptions; the compile-time guarantee lives here.
 */
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
import type { DiscriminantExpectedEntity } from './entities/DiscriminantExpectedEntity.js';
import type { DiscriminantShapeEntity } from './entities/DiscriminantShapeEntity.js';

import { ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  PaginatorAvailableCursorEntity,
  PaginatorExhaustedStateEntity,
  PaginatorHasMoreStateEntity,
  PaginatorPageReceivedEventEntity
} from '../../../src/entities/index.js';
import scenarioGroups from './discriminantNarrowing.scenarios.json' with { 'type': 'json' };

interface CursorScenarioCaseInterface {
  'description': string;
  'expected': DiscriminantExpectedEntity.Type;
  'input': { 'cursors': (PaginatorAvailableCursorInterface<number> | PaginatorExhaustedCursorEntity.Type)[] };
  'name': string;
  'shape': Extract<DiscriminantShapeEntity.Type['shape'], 'cursor-discriminants'>;
}

interface EventScenarioCaseInterface {
  'description': string;
  'expected': DiscriminantExpectedEntity.Type;
  'input': { 'events': (PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>)[] };
  'name': string;
  'shape': Extract<DiscriminantShapeEntity.Type['shape'], 'event-discriminants'>;
}

interface StateScenarioCaseInterface {
  'description': string;
  'expected': DiscriminantExpectedEntity.Type;
  'input': {
    'states': (
      PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<string, number>
      | PaginatorExhaustedStateInterface<string>
    )[];
  };
  'name': string;
  'shape': Extract<DiscriminantShapeEntity.Type['shape'], 'state-discriminants'>;
}

class DiscriminantNarrowingRunners {
  static describeCursor(
    cursor: PaginatorAvailableCursorInterface<number> | PaginatorExhaustedCursorEntity.Type
  ): string {
    const result = cursor.exhausted ? 'exhausted' : `cursor:${String(cursor.cursor)}`;

    return result;
  }

  static describeEvent(
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
  ): string {
    if (event.type === 'reset') {
      return event.type;
    }

    const result = `${event.page}:${DiscriminantNarrowingRunners.describeCursor(event.nextCursor)}`;

    return result;
  }

  static describeState(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<string, number>
      | PaginatorExhaustedStateInterface<string>
  ): string {
    if (state.variant === 'exhausted') {
      return `${state.pages.join(',')}:exhausted`;
    }

    if (state.variant === 'hasMore') {
      return `${state.pages.join(',')}:cursor:${String(state.cursor)}`;
    }

    return state.variant;
  }

  static runCursorDiscriminants(scenarioCase: CursorScenarioCaseInterface): void {
    assert.deepStrictEqual(
      scenarioCase.input.cursors.map(DiscriminantNarrowingRunners.describeCursor),
      scenarioCase.expected.descriptions
    );
  }

  static runEventDiscriminants(scenarioCase: EventScenarioCaseInterface): void {
    assert.deepStrictEqual(
      scenarioCase.input.events.map(DiscriminantNarrowingRunners.describeEvent),
      scenarioCase.expected.descriptions
    );
  }

  static runStateDiscriminants(scenarioCase: StateScenarioCaseInterface): void {
    assert.deepStrictEqual(
      scenarioCase.input.states.map(DiscriminantNarrowingRunners.describeState),
      scenarioCase.expected.descriptions
    );
  }

  static run(scenarioCase: CursorScenarioCaseInterface | EventScenarioCaseInterface | StateScenarioCaseInterface): void {
    switch (scenarioCase.shape) {
      case 'cursor-discriminants':
        DiscriminantNarrowingRunners.runCursorDiscriminants(scenarioCase);
        return;
      case 'event-discriminants':
        DiscriminantNarrowingRunners.runEventDiscriminants(scenarioCase);
        return;
      case 'state-discriminants':
        DiscriminantNarrowingRunners.runStateDiscriminants(scenarioCase);
        return;
    }
  }
}

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

void describe('Paginator discriminant narrowing', () => {
  const scenarioCases = scenarioGroups.cases as (
    CursorScenarioCaseInterface | EventScenarioCaseInterface | StateScenarioCaseInterface
  )[];

  for (let index = 0; index < scenarioCases.length; index += 1) {
    const scenarioCase = ScenarioValues.requireDefined(scenarioCases[index], 'scenarioCases[index]');

    void it(scenarioCase.name, () => {
      DiscriminantNarrowingRunners.run(scenarioCase);
    });
  }
});
