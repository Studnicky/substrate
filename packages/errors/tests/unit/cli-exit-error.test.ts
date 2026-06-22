/**
 * CliExitError Unit Tests
 */

import {
  ok,
  strictEqual
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { BaseError } from '../../src/errors/BaseError.js';
import { CliExitError } from '../../src/errors/CliExitError.js';

void describe('CliExitError', () => {
  void describe('construction', () => {
    void it('is an instance of Error, BaseError, and CliExitError', () => {
      const err = new CliExitError();
      ok(err instanceof Error);
      ok(err instanceof BaseError);
      ok(err instanceof CliExitError);
    });

    void it('defaults exitCode to 1', () => {
      const err = new CliExitError();
      strictEqual(err.exitCode, 1);
    });

    void it('accepts a custom exitCode', () => {
      const err = new CliExitError(2);
      strictEqual(err.exitCode, 2);
    });

    void it('has exitCode 0 for success', () => {
      const err = new CliExitError(0);
      strictEqual(err.exitCode, 0);
    });

    void it('has code cli.exit', () => {
      const err = new CliExitError();
      strictEqual(err.code, 'cli.exit');
    });

    void it('is not retryable', () => {
      const err = new CliExitError();
      strictEqual(err.retryable, false);
    });

    void it('has empty message', () => {
      const err = new CliExitError();
      strictEqual(err.message, '');
    });

    void it('has name CliExitError', () => {
      const err = new CliExitError();
      strictEqual(err.name, 'CliExitError');
    });
  });

  void describe('toJSON()', () => {
    void it('serializes with code cli.exit', () => {
      const err = new CliExitError(3);
      const json = err.toJSON() as Record<string, unknown>;
      strictEqual(json['code'], 'cli.exit');
    });
  });
});
