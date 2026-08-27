import assert from 'node:assert/strict';
import { it } from 'node:test';

import { DrilldownUtilities } from '../../src/modules/DrilldownUtilities.js';

it('getPropertyValue reads a top-level property', () => {
  assert.equal(DrilldownUtilities.getPropertyValue({ 'name': 'alpha' }, 'name'), 'alpha');
});

it('getPropertyValue reads a nested dot-notation path', () => {
  assert.equal(DrilldownUtilities.getPropertyValue({ 'a': { 'b': 'value' } }, 'a.b'), 'value');
});

it('getPropertyValue refuses a bare dunder-key path', () => {
  assert.equal(DrilldownUtilities.getPropertyValue({}, '__proto__'), undefined);
  assert.equal(DrilldownUtilities.getPropertyValue({}, 'constructor'), undefined);
  assert.equal(DrilldownUtilities.getPropertyValue({}, 'prototype'), undefined);
});

it('getPropertyValue refuses a dunder-key segment inside a nested path', () => {
  assert.equal(DrilldownUtilities.getPropertyValue({ 'a': {} }, 'a.__proto__'), undefined);
  assert.equal(DrilldownUtilities.getPropertyValue({ 'a': {} }, 'a.constructor'), undefined);
  assert.equal(DrilldownUtilities.getPropertyValue({ 'a': {} }, 'a.prototype'), undefined);
});
