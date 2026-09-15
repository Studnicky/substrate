import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FilterError } from '../../src/errors/FilterError.js';

void describe('FilterError canonical options', () => {
  void it('forwards the shared error arguments', () => {
    const error = new FilterError('filter context', {
      'code': 'filters.context',
      'correlationId': 'filter-correlation',
      'instance': 'urn:filters:context',
      'metadata': { 'filterId': 1 },
      'retryable': true,
      'status': 400
    });

    assert.equal(error.correlationId, 'filter-correlation');
    assert.equal(error.instance, 'urn:filters:context');
    assert.deepEqual(error.metadata, { 'filterId': 1 });
    assert.equal(error.retryable, true);
    assert.equal(error.status, 400);
  });
});
