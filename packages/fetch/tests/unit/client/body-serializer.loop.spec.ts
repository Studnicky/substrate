import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BodySerializer } from '../../../src/modules/BodySerializer.js';

import { BodySerializerScenarioCaseEntity } from './entities/BodySerializerScenarioCaseEntity.js';
import scenarioGroups from './body-serializer.scenarios.json' with { type: 'json' };

type ScenarioCase = BodySerializerScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(BodySerializerScenarioCaseEntity.Schema, BodySerializerScenarioCaseEntity.Node);

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => void;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };

const runnerMap: RunnerMap = {
  'needs-json-content-type-array': (scenarioCase) => {
    assert.equal(BodySerializer.needsJsonContentType(scenarioCase.input.body), scenarioCase.expected.decision);
  },
  'needs-json-content-type-buffer': (scenarioCase) => {
    assert.equal(BodySerializer.needsJsonContentType(Buffer.from(scenarioCase.input.body.bytes)), scenarioCase.expected.decision);
  },
  'needs-json-content-type-object': (scenarioCase) => {
    assert.equal(BodySerializer.needsJsonContentType(scenarioCase.input.body), scenarioCase.expected.decision);
  },
  'needs-json-content-type-primitive': (scenarioCase) => {
    assert.equal(BodySerializer.needsJsonContentType(scenarioCase.input.body), scenarioCase.expected.decision);
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

void describe('body serializer', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
