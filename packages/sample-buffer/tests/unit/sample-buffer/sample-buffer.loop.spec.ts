import { ScenarioFileCompiler } from "@studnicky/scenario-kit/node";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SampleBuffer } from "../../../src/sample-buffer/SampleBuffer.js";
import { SampleBufferError } from "../../../src/errors/SampleBufferError.js";
import { SampleBufferScenarioCaseEntity } from "../entities/SampleBufferScenarioCaseEntity.js";
import scenarioGroups from "./sample-buffer.scenarios.json" with { type: "json" };

type ScenarioShape = SampleBufferScenarioCaseEntity.Type["shape"];
type RunnerMap = {
  [K in ScenarioShape]: (scenarioCase: SampleBufferScenarioCaseEntity.Type & { shape: K }) => void;
};

const runnerMap: RunnerMap = {
  "capacity-error": (scenarioCase) => {
    assert.throws(
      () => SampleBuffer.create(scenarioCase.input.sampleBuffer),
      (err) => {
        assert.ok(err instanceof SampleBufferError);
        assert.equal(err.constructor.name, scenarioCase.expected.errorName);
        return true;
      },
    );
  },
  "clear-resets": (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    pushValues(buf, scenarioCase.input.pushes);
    buf.clear();
    assert.equal(buf.length, scenarioCase.expected.length);
    assert.equal(buf.isFull, scenarioCase.expected.full);
    assert.equal(
      buf.percentile(scenarioCase.input.pct),
      scenarioCase.expected.percentile ?? undefined,
    );
  },
  construction: (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    assert.equal(buf.length, scenarioCase.expected.length);
    assert.equal(buf.isFull, scenarioCase.expected.full);
  },
  "invalid-multi-error": (scenarioCase) => {
    assert.throws(
      () => SampleBuffer.create(scenarioCase.input.sampleBuffer),
      (err) => {
        assert.ok(err instanceof SampleBufferError);
        assert.equal(err.constructor.name, scenarioCase.expected.errorName);
        for (const fragment of scenarioCase.expected.messageIncludes) {
          assert.ok(err.message.includes(fragment));
        }
        return true;
      },
    );
  },
  "is-full": (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    pushValues(buf, scenarioCase.input.pushes);
    assert.equal(buf.isFull, scenarioCase.expected.full);
  },
  "maintains-length": (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    pushValues(buf, scenarioCase.input.pushes);
    assert.equal(buf.length, scenarioCase.expected.length);
    assert.equal(buf.isFull, scenarioCase.expected.isFull);
  },
  "overwrites-oldest": (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    pushValues(buf, scenarioCase.input.pushes);
    assert.equal(buf.length, scenarioCase.expected.length);
    assert.equal(buf.isFull, scenarioCase.expected.isFull);
    assert.equal(
      buf.percentile(scenarioCase.input.pct),
      scenarioCase.expected.percentile,
    );
  },
  percentile: (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    pushValues(buf, scenarioCase.input.samples);
    assert.equal(
      buf.percentile(scenarioCase.input.pct),
      scenarioCase.expected.percentile ?? undefined,
    );
  },
  "percentile-batch": (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    const sampleLimit =
      scenarioCase.input.startValue + scenarioCase.input.batch.sampleCount;
    for (
      let value = scenarioCase.input.startValue;
      value < sampleLimit;
      value += 1
    ) {
      buf.push(value);
    }
    assert.equal(
      buf.percentile(scenarioCase.input.pct),
      scenarioCase.expected.percentile,
    );
  },
  "push-lengths": (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    for (let i = 0; i < scenarioCase.input.pushes.length; i += 1) {
      buf.push(scenarioCase.input.pushes[i]!);
      assert.equal(buf.length, scenarioCase.expected.lengths[i]);
    }
  },
  "recalculate-after-push": (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    pushValues(buf, scenarioCase.input.pushes);
    const percentileBefore = buf.percentile(scenarioCase.input.pct);
    buf.push(scenarioCase.input.pushAfter);
    const percentileAfter = buf.percentile(scenarioCase.input.pct);
    assert.ok(
      percentileAfter !== undefined && percentileBefore !== undefined,
      "percentiles should be defined",
    );
    assert.ok(
      percentileAfter > percentileBefore,
      "percentile should increase after adding high value",
    );
    assert.equal(percentileBefore, scenarioCase.expected.percentileBefore);
    assert.equal(percentileAfter, scenarioCase.expected.percentileAfter);
  },
  "reuse-after-clear": (scenarioCase) => {
    const buf = SampleBuffer.create(scenarioCase.input.sampleBuffer);
    pushValues(buf, scenarioCase.input.firstPushes);
    buf.clear();
    pushValues(buf, scenarioCase.input.secondPushes);
    assert.equal(buf.length, scenarioCase.expected.length);
    assert.equal(
      buf.percentile(scenarioCase.input.pct),
      scenarioCase.expected.percentile,
    );
  },
};

function dispatchCase<K extends ScenarioShape>(
  shape: K,
  scenarioCase: SampleBufferScenarioCaseEntity.Type & { shape: K },
): void {
  runnerMap[shape](scenarioCase);
}

function runCase(scenarioCase: SampleBufferScenarioCaseEntity.Type): void {
  dispatchCase(scenarioCase.shape, scenarioCase);
}

function pushValues(buffer: SampleBuffer, values: readonly number[]): void {
  for (const value of values) {
    buffer.push(value);
  }
}

const fileIntake = ScenarioFileCompiler.compileIntake(SampleBufferScenarioCaseEntity.Schema, SampleBufferScenarioCaseEntity.Node);

void describe("SampleBuffer", () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
