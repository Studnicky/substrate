import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorClassifier, matchers } from '../../src/index.js';

void describe('matchers', () => {
  void it('exposes one immutable matcher route', () => {
    strictEqual(Object.isFrozen(matchers), true);
    strictEqual(Object.isFrozen(matchers.number), true);
    strictEqual(Object.isFrozen(matchers.http), true);
    strictEqual(Object.hasOwn(ErrorClassifier, 'NUMBER_MATCHERS'), false);
    strictEqual(Object.hasOwn(ErrorClassifier, 'HTTP_MATCHERS'), false);
    strictEqual(Object.hasOwn(matchers.instance, 'isType'), false);
    strictEqual(matchers.isType<string>('string')('value'), true);
    strictEqual(matchers.isType<number>('number')('value'), false);
  });
});
