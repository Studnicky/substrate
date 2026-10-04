import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { SampleBufferError } from '../../../src/errors/SampleBufferError.js';
import { SampleBuffer } from '../../../src/samples/SampleBuffer.js';
import { SampleBufferScenarioCaseEntity } from '../entities/SampleBufferScenarioCaseEntity.js';
import scenarioGroups from './sample-buffer.scenarios.json' with { 'type': 'json' };

class SampleBufferRunners {
  static 'capacity-error'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'capacity-error'>
  ): void {
    assert.throws(
      () => {
        SampleBuffer.create(scenarioCase.input.sampleBuffer);
      },
      (thrown) => {
        const error: unknown = thrown;
        assert.ok(error instanceof SampleBufferError);
        assert.equal(error.constructor.name, scenarioCase.expected.errorName);
        return true;
      }
    );
  }

  static 'clear-resets'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'clear-resets'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    SampleBufferRunners.pushValues(buffer, scenarioCase.input.pushes);
    buffer.clear();
    assert.equal(buffer.length, scenarioCase.expected.length);
    assert.equal(buffer.isFull, scenarioCase.expected.full);
    assert.equal(
      buffer.percentile(scenarioCase.input.pct),
      scenarioCase.expected.percentile ?? undefined
    );
  }

  static construction(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'construction'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    assert.equal(buffer.length, scenarioCase.expected.length);
    assert.equal(buffer.isFull, scenarioCase.expected.full);
  }

  static 'invalid-multi-error'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'invalid-multi-error'>
  ): void {
    assert.throws(
      () => {
        SampleBuffer.create(scenarioCase.input.sampleBuffer);
      },
      (thrown) => {
        const error: unknown = thrown;
        assert.ok(error instanceof SampleBufferError);
        assert.equal(error.constructor.name, scenarioCase.expected.errorName);
        const fragments = scenarioCase.expected.messageIncludes;
        for (let index = 0; index < fragments.length; index += 1) {
          assert.ok(error.message.includes(String(fragments[index])));
        }
        return true;
      }
    );
  }

  static 'is-full'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'is-full'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    SampleBufferRunners.pushValues(buffer, scenarioCase.input.pushes);
    assert.equal(buffer.isFull, scenarioCase.expected.full);
  }

  static 'maintains-length'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'maintains-length'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    SampleBufferRunners.pushValues(buffer, scenarioCase.input.pushes);
    assert.equal(buffer.length, scenarioCase.expected.length);
    assert.equal(buffer.isFull, scenarioCase.expected.isFull);
  }

  static 'overwrites-oldest'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'overwrites-oldest'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    SampleBufferRunners.pushValues(buffer, scenarioCase.input.pushes);
    assert.equal(buffer.length, scenarioCase.expected.length);
    assert.equal(buffer.isFull, scenarioCase.expected.isFull);
    assert.equal(buffer.percentile(scenarioCase.input.pct), scenarioCase.expected.percentile);
  }

  static percentile(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'percentile'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    SampleBufferRunners.pushValues(buffer, scenarioCase.input.samples);
    assert.equal(
      buffer.percentile(scenarioCase.input.pct),
      scenarioCase.expected.percentile ?? undefined
    );
  }

  static 'percentile-batch'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'percentile-batch'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    const sampleLimit = scenarioCase.input.startValue + scenarioCase.input.batch.sampleCount;
    for (let value = scenarioCase.input.startValue; value < sampleLimit; value += 1) {
      buffer.push(value);
    }
    assert.equal(buffer.percentile(scenarioCase.input.pct), scenarioCase.expected.percentile);
  }

  static 'push-lengths'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'push-lengths'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    const pushes = scenarioCase.input.pushes;
    for (let index = 0; index < pushes.length; index += 1) {
      buffer.push(Number(pushes[index]));
      assert.equal(buffer.length, scenarioCase.expected.lengths[index]);
    }
  }

  static 'recalculate-after-push'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'recalculate-after-push'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    SampleBufferRunners.pushValues(buffer, scenarioCase.input.pushes);
    const percentileBefore = buffer.percentile(scenarioCase.input.pct);
    buffer.push(scenarioCase.input.pushAfter);
    const percentileAfter = buffer.percentile(scenarioCase.input.pct);
    assert.ok(
      percentileAfter !== undefined && percentileBefore !== undefined,
      'percentiles should be defined'
    );
    assert.ok(
      percentileAfter > percentileBefore,
      'percentile should increase after adding high value'
    );
    assert.equal(percentileBefore, scenarioCase.expected.percentileBefore);
    assert.equal(percentileAfter, scenarioCase.expected.percentileAfter);
  }

  static 'reuse-after-clear'(
    scenarioCase: ScenarioCaseOfType<SampleBufferScenarioCaseEntity.Type, 'reuse-after-clear'>
  ): void {
    const buffer = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    SampleBufferRunners.pushValues(buffer, scenarioCase.input.firstPushes);
    buffer.clear();
    SampleBufferRunners.pushValues(buffer, scenarioCase.input.secondPushes);
    assert.equal(buffer.length, scenarioCase.expected.length);
    assert.equal(buffer.percentile(scenarioCase.input.pct), scenarioCase.expected.percentile);
  }

  private static pushValues(buffer: SampleBuffer, values: readonly number[]): void {
    for (let index = 0; index < values.length; index += 1) {
      buffer.push(Number(values[index]));
    }
  }
}

ScenarioSuite.register({
  'entity': SampleBufferScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'SampleBuffer',
  'runners': SampleBufferRunners
});
