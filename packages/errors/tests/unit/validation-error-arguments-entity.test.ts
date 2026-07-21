import {
  strictEqual
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { ValidationErrorArgumentsEntity } from '../../src/entities/ValidationErrorArgumentsEntity.js';

void describe('ValidationErrorArgumentsEntity', () => {
  void it('accepts canonical validation error arguments', () => {
    strictEqual(ValidationErrorArgumentsEntity.validate({
      'correlationId': 'request-42',
      'message': 'Must be an email address',
      'path': '/email',
      'violations': [
        {
          'details': { 'format': 'email' },
          'message': 'Invalid format',
          'path': '/email'
        }
      ]
    }), true);
  });

  void it('rejects an undeclared top-level property', () => {
    strictEqual(ValidationErrorArgumentsEntity.validate({
      'message': 'Invalid value',
      'path': '/value',
      'unexpected': true
    }), false);
  });

  void it('rejects a malformed violation', () => {
    strictEqual(ValidationErrorArgumentsEntity.validate({
      'message': 'Invalid value',
      'path': '/value',
      'violations': [{ 'message': 'Missing violation path' }]
    }), false);
  });
});
