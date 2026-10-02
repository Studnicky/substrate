import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ExampleScenarioEntity } from '../../src/entities/ExampleScenarioEntity.js';
import { ExampleSmokeError } from '../../src/errors/ExampleSmokeError.js';
import { ExampleSmokeRunner } from '../../src/ExampleSmokeRunner.js';

void describe('ExampleSmokeRunner platform failures', () => {
  void it('surfaces an unreadable worker parent file as an ExampleSmokeError with the fs error as cause', async () => {
    let caught: unknown;
    try {
      await ExampleSmokeRunner.runScenario(
        ExampleScenarioEntity.intake({
          'description': 'worker entry with a missing parent',
          'expected': { 'referencedByParent': true },
          'input': { 'file': 'worker.ts', 'parentFile': './missing-parent.ts' },
          'name': 'missing-parent',
          'shape': 'worker-entry'
        }),
        { 'packageName': 'example', 'specUrl': import.meta.url }
      );
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof ExampleSmokeError);
    assert.equal(caught.code, 'exampleSmoke.fileUnreadable');
    const cause: unknown = caught.cause;
    assert.ok(Predicates.isObject(cause));
    assert.equal(cause.code, 'ENOENT');
  });
});
