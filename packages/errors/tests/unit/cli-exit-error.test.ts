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

    const exitCodeScenarios: Array<{ description: string; input: number | undefined; expected: number }> = [
      { description: 'defaults exitCode to 1', expected: 1, input: undefined },
      { description: 'accepts a custom exitCode', expected: 2, input: 2 },
      { description: 'has exitCode 0 for success', expected: 0, input: 0 }
    ];

    for (const { description, input, expected } of exitCodeScenarios) {
      void it(description, () => {
        const err = input === undefined ? new CliExitError() : new CliExitError(input);
        strictEqual(err.exitCode, expected);
      });
    }

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
