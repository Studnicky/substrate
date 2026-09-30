import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { BodySerializer } from '../../../src/modules/BodySerializer.js';
import scenarioGroups from './body-serializer.scenarios.json' with { 'type': 'json' };
import { BodySerializerScenarioCaseEntity } from './entities/BodySerializerScenarioCaseEntity.js';

class BodySerializerRunners {
  static 'data-view-visible-range'(scenarioCase: ScenarioCaseOfType<BodySerializerScenarioCaseEntity.Type, 'data-view-visible-range'>): void {
    const source = new Uint8Array(scenarioCase.input.source);
    const view = new DataView(source.buffer, scenarioCase.input.view.byteOffset, scenarioCase.input.view.byteLength);

    const serialized = BodySerializer.serialize(view);

    assert.ok(serialized instanceof Uint8Array);
    assert.strictEqual(serialized.constructor.name, scenarioCase.expected.constructorName);
    assert.deepEqual(Array.from(serialized), scenarioCase.expected.bytes);

    source.fill(42, 1, 2);
    assert.deepEqual(Array.from(serialized), scenarioCase.expected.bytes);
  }

  static 'needs-json-content-type-array'(scenarioCase: ScenarioCaseOfType<BodySerializerScenarioCaseEntity.Type, 'needs-json-content-type-array'>): void {
    assert.equal(BodySerializer.needsJsonContentType(scenarioCase.input.body), scenarioCase.expected.decision);
  }

  static 'needs-json-content-type-buffer'(scenarioCase: ScenarioCaseOfType<BodySerializerScenarioCaseEntity.Type, 'needs-json-content-type-buffer'>): void {
    assert.equal(BodySerializer.needsJsonContentType(Buffer.from(scenarioCase.input.body.bytes)), scenarioCase.expected.decision);
  }

  static 'needs-json-content-type-object'(scenarioCase: ScenarioCaseOfType<BodySerializerScenarioCaseEntity.Type, 'needs-json-content-type-object'>): void {
    assert.equal(BodySerializer.needsJsonContentType(scenarioCase.input.body), scenarioCase.expected.decision);
  }

  static 'needs-json-content-type-primitive'(scenarioCase: ScenarioCaseOfType<BodySerializerScenarioCaseEntity.Type, 'needs-json-content-type-primitive'>): void {
    assert.equal(BodySerializer.needsJsonContentType(scenarioCase.input.body), scenarioCase.expected.decision);
  }

  static 'typed-array-byte-range'(scenarioCase: ScenarioCaseOfType<BodySerializerScenarioCaseEntity.Type, 'typed-array-byte-range'>): void {
    const source = new Uint16Array(scenarioCase.input.source);
    const expected = Array.from(new Uint8Array(source.buffer, source.byteOffset, source.byteLength));

    const serialized = BodySerializer.serialize(source);

    assert.ok(serialized instanceof Uint8Array);
    assert.strictEqual(serialized.constructor.name, scenarioCase.expected.constructorName);
    assert.deepEqual(Array.from(serialized), scenarioCase.expected.bytes);

    source.fill(0);
    assert.deepEqual(Array.from(serialized), expected);
    assert.equal(scenarioCase.expected.remainsDetachedAfterSourceMutation, true);
  }
}

ScenarioSuite.register({
  'entity': BodySerializerScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'body serializer',
  'runners': BodySerializerRunners
});
