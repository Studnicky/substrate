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

import scenarioGroups from './discriminantNarrowing.scenarios.json' with { type: 'json' };

type CursorUnion = PaginatorAvailableCursorInterface<number> | PaginatorExhaustedCursorEntity.Type;
type EventUnion = PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>;
type StateUnion =
  | PaginatorIdleStateEntity.Type
  | PaginatorHasMoreStateInterface<string, number>
  | PaginatorExhaustedStateInterface<string>;

function describeCursor(cursor: CursorUnion): string {
  const result = cursor.exhausted ? 'exhausted' : `cursor:${String(cursor.cursor)}`;

  return result;
}

function describeEvent(event: EventUnion): string {
  if (event.type === 'reset') {
    return event.type;
  }

  const result = `${event.page}:${describeCursor(event.nextCursor)}`;

  return result;
}

function describeState(state: StateUnion): string {
  switch (state.variant) {
    case 'idle':
      return state.variant;
    case 'hasMore':
      return `${state.pages.join(',')}:cursor:${String(state.cursor)}`;
    case 'exhausted':
      return `${state.pages.join(',')}:exhausted`;
  }
}

type ScenarioCase =
  | { description: string; expected: { descriptions: string[] }; input: { cursors: CursorUnion[] }; shape: 'cursor-discriminants'; name: string }
  | { description: string; expected: { descriptions: string[] }; input: { events: EventUnion[] }; shape: 'event-discriminants'; name: string }
  | { description: string; expected: { descriptions: string[] }; input: { states: StateUnion[] }; shape: 'state-discriminants'; name: string };

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => void;

const scenarioRunners: { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> } = {
  'cursor-discriminants': (scenarioCase) => {
    assert.deepStrictEqual(scenarioCase.input.cursors.map(describeCursor), scenarioCase.expected.descriptions);
  },
  'event-discriminants': (scenarioCase) => {
    assert.deepStrictEqual(scenarioCase.input.events.map(describeEvent), scenarioCase.expected.descriptions);
  },
  'state-discriminants': (scenarioCase) => {
    assert.deepStrictEqual(scenarioCase.input.states.map(describeState), scenarioCase.expected.descriptions);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const runner = scenarioRunners[scenarioCase.shape] as ScenarioRunner<ScenarioCase['shape']>;

  runner(scenarioCase);
}

void describe('Paginator discriminant narrowing', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
