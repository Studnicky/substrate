import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorDiagnosticEntity } from '../../src/entities/ErrorDiagnosticEntity.js';

void describe('ErrorDiagnosticEntity', () => {
  void it('accepts canonical error diagnostics', () => {
    assert.strictEqual(ErrorDiagnosticEntity.validate({
      'message': 'connection failed',
      'name': 'ConnectionError',
      'stack': 'ConnectionError: connection failed'
    }), true);
  });

  void it('rejects missing and malformed diagnostic fields', () => {
    assert.strictEqual(ErrorDiagnosticEntity.validate({ 'message': 'missing name' }), false);
    assert.strictEqual(ErrorDiagnosticEntity.validate({ 'message': 'bad stack', 'name': 'Error', 'stack': 1 }), false);
  });
});
