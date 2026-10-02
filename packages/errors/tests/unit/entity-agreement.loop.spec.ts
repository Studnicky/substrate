import type { CauseNodeInterface, ProblemDetailsInterface, ThrownValueInterface } from '@studnicky/types/browser';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CauseNodeEntity } from '../../src/entities/CauseNodeEntity.js';
import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { ThrownValueEntity } from '../../src/entities/ThrownValueEntity.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';

void describe('entity and types interface agreement', () => {
  void it('derives entity types assignable to the interfaces owned by @studnicky/types', () => {
    const cause: CauseNodeInterface = CauseNodeEntity.intake({ 'detail': 'boom', 'title': 'Error', 'type': 'https://problems.studnicky.dev/error' });
    const problem: ProblemDetailsInterface = ProblemDetailsEntity.intake({ 'title': 'Not Found' });
    const thrown: ThrownValueInterface = ThrownValueEntity.intake(RuntimeError.create('boom', { 'cause': 'inner' }));

    assert.equal(cause.detail, 'boom');
    assert.equal(problem.title, 'Not Found');
    assert.equal(thrown.causes?.length, 1);
  });
});
