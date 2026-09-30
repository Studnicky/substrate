import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CallerFault } from '../../src/errors/CallerFault.js';
import scenarioGroups from './caller-fault.scenarios.json' with { type: 'json' };

type ScenarioCase = (typeof scenarioGroups.cases)[number];

const valueByShape = new Map<string, () => unknown>([
  ['error', (): unknown => new Error('caller')],
  ['null', (): unknown => null],
  ['object', (): unknown => ({ 'caller': true })],
  ['string', (): unknown => 'caller'],
  ['type-error', (): unknown => new TypeError('caller')],
  ['undefined', (): unknown => undefined]
]);

function thrownBy(value: unknown): unknown {
  try {
    CallerFault.propagate(value);
  } catch (caught: unknown) {
    return caught;
  }

  return Symbol('propagate returned');
}

function run(scenarioCase: ScenarioCase): void {
  const factory = valueByShape.get(scenarioCase.input.shape);

  assert.ok(factory !== undefined, `unknown shape ${scenarioCase.input.shape}`);

  const value = factory();

  assert.equal(thrownBy(value), value);
}

async function rejectedWith(value: unknown): Promise<unknown> {
  try {
    await CallerFault.rejection(value);
  } catch (caught: unknown) {
    return caught;
  }

  return Symbol('rejection resolved');
}

async function runRejection(scenarioCase: ScenarioCase): Promise<void> {
  const factory = valueByShape.get(scenarioCase.input.shape);

  assert.ok(factory !== undefined, `unknown shape ${scenarioCase.input.shape}`);

  const value = factory();

  assert.equal(await rejectedWith(value), value);
}

void describe('CallerFault', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(scenarioCase.description, () => {
      run(scenarioCase);
    });

    void it(scenarioCase.description.replace('propagate rethrows', 'rejection rejects with'), async () => {
      await runRejection(scenarioCase);
    });
  }
});
