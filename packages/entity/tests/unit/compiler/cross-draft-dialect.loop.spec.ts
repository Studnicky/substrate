import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityClosureRegistry } from '../../../src/compiler/EntityClosureRegistry.js';

const assertRegistry = EntityClosureRegistry.create(false);

void describe('cross-draft $ref — historic-draft resources lose 2020-12-only keywords', () => {
  const HISTORIC_DRAFT_RESOURCE = {    '$id': 'https://example.com/dialect/historic-resource',    '$schema': 'https://json-schema.org/draft/2019-09/schema',    'prefixItems': [{ 'type': 'string' }]  };  const CURRENT_DRAFT_RESOURCE = {    '$id': 'https://example.com/dialect/current-resource',    '$schema': 'https://json-schema.org/draft/2020-12/schema',    'prefixItems': [{ 'type': 'string' }]  };

  void it('a $ref into a 2019-09 resource ignores prefixItems as an unknown keyword', () => {
    const validate = assertRegistry.compile({ '$ref': 'https://example.com/dialect/historic-resource' }, new Map([
      ['https://example.com/dialect/historic-resource', HISTORIC_DRAFT_RESOURCE]
    ]));
    assert.equal(validate([1, 2, 3]), true);
  });

  void it('a $ref into a 2020-12 resource honours prefixItems', () => {
    const validate = assertRegistry.compile({ '$ref': 'https://example.com/dialect/current-resource' }, new Map([
      ['https://example.com/dialect/current-resource', CURRENT_DRAFT_RESOURCE]
    ]));
    assert.equal(validate([1, 2, 3]), false);
    assert.equal(validate(['ok', 2, 3]), true);
  });
});
