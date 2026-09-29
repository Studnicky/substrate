import type { CauseNodeInterface, ProblemDetailsInterface, ThrownValueInterface } from '@studnicky/types/browser';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CauseNodeEntity } from '../../src/entities/CauseNodeEntity.js';
import { ProblemDetailsEntity } from '../../src/entities/ProblemDetailsEntity.js';
import { ThrownValueEntity } from '../../src/entities/ThrownValueEntity.js';

class EntityAgreement {
  public static causeNode(entity: CauseNodeEntity.Type): CauseNodeInterface {
    return entity;
  }

  public static problemDetails(entity: ProblemDetailsEntity.Type): ProblemDetailsInterface {
    return entity;
  }

  public static thrownValue(entity: ThrownValueEntity.Type): ThrownValueInterface {
    return entity;
  }
}

void describe('entity and types interface agreement', () => {
  void it('derives entity types assignable to the interfaces owned by @studnicky/types', () => {
    const cause = CauseNodeEntity.intake({ 'detail': 'boom', 'title': 'Error', 'type': 'https://problems.studnicky.dev/error' });
    const problem = ProblemDetailsEntity.intake({ 'title': 'Not Found' });
    const thrown = ThrownValueEntity.intake(new Error('boom', { 'cause': 'inner' }));

    assert.equal(EntityAgreement.causeNode(cause).detail, 'boom');
    assert.equal(EntityAgreement.problemDetails(problem).title, 'Not Found');
    assert.equal(EntityAgreement.thrownValue(thrown).causes?.length, 1);
  });
});
