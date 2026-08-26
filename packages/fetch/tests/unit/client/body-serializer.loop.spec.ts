import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BodySerializer } from '../../../src/modules/BodySerializer.js';
import scenarioGroups from './body-serializer.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { decision: boolean };
      input: { body: unknown };
      shape: 'needs-json-content-type-array';
      name: string;
    }
  | {
      description: string;
      expected: { decision: boolean };
      input: { body: unknown };
      shape: 'needs-json-content-type-buffer';
      name: string;
    }
  | {
      description: string;
      expected: { decision: boolean };
      input: { body: unknown };
      shape: 'needs-json-content-type-object';
      name: string;
    }
  | {
      description: string;
      expected: { decision: boolean };
      input: { body: unknown };
      shape: 'needs-json-content-type-primitive';
      name: string;
    }
  | {
      description: string;
      expected: { bytes: number[]; constructorName: 'Uint8Array' };
      input: { shape: 'data-view-visible-range'; source: number[]; view: { byteLength: number; byteOffset: number } };
      shape: 'data-view-visible-range';
      name: string;
    }
  | {
      description: string;
      expected: { bytes: number[]; constructorName: 'Uint8Array'; remainsDetachedAfterSourceMutation: true };
      input: { shape: 'typed-array-byte-range'; source: number[]; typedArray: 'Uint16Array' };
      shape: 'typed-array-byte-range';
      name: string;
    };

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => void;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };
type BodyScenarioCase = Extract<ScenarioCase, { input: { body: unknown } }>;

const runnerMap: RunnerMap = {
  'needs-json-content-type-array': (scenarioCase) => {
    assert.equal(BodySerializer.needsJsonContentType(materializeBody(scenarioCase.input.body)), scenarioCase.expected.decision);
  },
  'needs-json-content-type-buffer': (scenarioCase) => {
    assert.equal(BodySerializer.needsJsonContentType(materializeBody(scenarioCase.input.body)), scenarioCase.expected.decision);
  },
  'needs-json-content-type-object': (scenarioCase) => {
    assert.equal(BodySerializer.needsJsonContentType(materializeBody(scenarioCase.input.body)), scenarioCase.expected.decision);
  },
  'needs-json-content-type-primitive': (scenarioCase) => {
    assert.equal(BodySerializer.needsJsonContentType(materializeBody(scenarioCase.input.body)), scenarioCase.expected.decision);
  },
  'data-view-visible-range': (scenarioCase) => {
    const source = new Uint8Array(scenarioCase.input.source);
    const view = new DataView(source.buffer, scenarioCase.input.view.byteOffset, scenarioCase.input.view.byteLength);

    const serialized = BodySerializer.serialize(view);

    assert.ok(serialized instanceof Uint8Array);
    assert.strictEqual(serialized.constructor.name, scenarioCase.expected.constructorName);
    assert.deepEqual([...serialized], scenarioCase.expected.bytes);

    source.fill(42, 1, 2);
    assert.deepEqual([...serialized], scenarioCase.expected.bytes);
  },
  'typed-array-byte-range': (scenarioCase) => {
    const source = new Uint16Array(scenarioCase.input.source);
    const expected = [...new Uint8Array(source.buffer, source.byteOffset, source.byteLength)];

    const serialized = BodySerializer.serialize(source);

    assert.ok(serialized instanceof Uint8Array);
    assert.strictEqual(serialized.constructor.name, scenarioCase.expected.constructorName);
    assert.deepEqual([...serialized], scenarioCase.expected.bytes);

    source.fill(0);
    assert.deepEqual([...serialized], expected);
    assert.equal(scenarioCase.expected.remainsDetachedAfterSourceMutation, true);
  }
};

function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

function materializeBody(body: BodyScenarioCase['input']['body']): BodyScenarioCase['input']['body'] {
  if (body === null || body === undefined) {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map((value) => { return materializeBody(value); });
  }

  if (typeof body === 'object') {
    const record = body as Record<string, unknown>;

    if (record.shape === 'buffer' && Array.isArray(record.bytes)) {
      return Buffer.from(record.bytes as number[]);
    }

    if (record.shape === 'undefined') {
      return undefined;
    }
  }

  return body;
}

void describe('body serializer', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
