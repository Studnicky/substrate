/**
 * `DomainErrorArgs.build()` — worked example mirrors `FileLockError` /
 * `FileLockTimeoutError` (packages/file-lock/src/errors/FileLockError.ts,
 * packages/file-lock/src/FileLockTimeoutError.ts):
 *
 * Before:
 * ```typescript
 * export class FileLockTimeoutError extends FileLockError {
 *   readonly path: string;
 *   readonly timeoutMs: number;
 *
 *   constructor(path: string, timeoutMs: number) {
 *     super({
 *       'code': 'fileLock.timeout',
 *       'message': `Timed out acquiring lock on "${path}" after ${String(timeoutMs)}ms`,
 *       'retryable': false
 *     });
 *     this.path = path;
 *     this.timeoutMs = timeoutMs;
 *   }
 * }
 * ```
 *
 * After — the leaf class keeps its existing `extends FileLockError` (so
 * `instanceof FileLockError` still holds), and collapses to:
 * ```typescript
 * export class FileLockTimeoutError extends FileLockError {
 *   readonly path!: string;
 *   readonly timeoutMs!: number;
 *
 *   constructor(path: string, timeoutMs: number) {
 *     const fields = { path, timeoutMs };
 *     super(DomainErrorArgs.build(fields, {
 *       'code': 'fileLock.timeout',
 *       'message': (f) => `Timed out acquiring lock on "${f.path}" after ${String(f.timeoutMs)}ms`,
 *       'retryable': false
 *     }));
 *     Object.assign(this, fields);
 *   }
 * }
 * ```
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
import { DomainErrorArgs } from '../../src/errors/DomainErrorArgs.js';
import type { BaseErrorArgumentsType } from '../../src/types/BaseErrorArgumentsType.js';

// Stand-in for `FileLockError` (packages/file-lock/src/errors/FileLockError.ts) —
// an abstract pass-through domain base that exists solely for `instanceof` checks.
abstract class StubFileLockError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super(args);
  }
}

type StubFileLockTimeoutFieldsType = {
  'path': string;
  'timeoutMs': number;
};

class StubFileLockTimeoutError extends StubFileLockError {
  readonly path!: string;
  readonly timeoutMs!: number;

  constructor(path: string, timeoutMs: number) {
    const fields: StubFileLockTimeoutFieldsType = { path, timeoutMs };
    super(DomainErrorArgs.build(fields, {
      'code': 'fileLock.timeout',
      'message': (f) => {return `Timed out acquiring lock on "${f.path}" after ${String(f.timeoutMs)}ms`;},
      'retryable': false
    }));
    Object.assign(this, fields);
  }
}

void describe('DomainErrorArgs.build()', () => {
  void it('assigns typed fields onto the instance via Object.assign', () => {
    const err = new StubFileLockTimeoutError('/tmp/lock', 5000);
    strictEqual(err.path, '/tmp/lock');
    strictEqual(err.timeoutMs, 5000);
  });

  void it('builds the message via the options.message callback', () => {
    const err = new StubFileLockTimeoutError('/tmp/lock', 5000);
    strictEqual(err.message, 'Timed out acquiring lock on "/tmp/lock" after 5000ms');
  });

  void it('forwards code and retryable to BaseError', () => {
    const err = new StubFileLockTimeoutError('/tmp/lock', 5000);
    strictEqual(err.code, 'fileLock.timeout');
    strictEqual(err.retryable, false);
  });

  void it('preserves instanceof the wrapped domain base and BaseError', () => {
    const err = new StubFileLockTimeoutError('/tmp/lock', 5000);
    ok(err instanceof Error);
    ok(err instanceof BaseError);
    ok(err instanceof StubFileLockError);
    ok(err instanceof StubFileLockTimeoutError);
  });

  void it('name resolves to the concrete leaf class (new.target.name)', () => {
    const err = new StubFileLockTimeoutError('/tmp/lock', 5000);
    strictEqual(err.name, 'StubFileLockTimeoutError');
  });

  void it('omits cause/correlationId/metadata/retryable from the built args when not provided', () => {
    const args = DomainErrorArgs.build({ 'path': '/tmp/lock', 'timeoutMs': 1000 }, {
      'code': 'fileLock.timeout',
      'message': () => {return 'timed out';}
    });
    ok(!('cause' in args));
    ok(!('correlationId' in args));
    ok(!('metadata' in args));
    ok(!('retryable' in args));
  });

  void it('includes cause, correlationId, metadata, and retryable when provided', () => {
    const cause = new Error('disk full');
    const args = DomainErrorArgs.build({ 'path': '/tmp/lock', 'timeoutMs': 1000 }, {
      'cause': cause,
      'code': 'fileLock.timeout',
      'correlationId': 'corr-1',
      'message': () => {return 'timed out';},
      'metadata': { 'attempt': 3 },
      'retryable': true
    });
    strictEqual(args.cause, cause);
    strictEqual(args.correlationId, 'corr-1');
    strictEqual(args.retryable, true);
    strictEqual(args.metadata?.attempt, 3);
  });

  void it('passes the same fields object to the message callback that the caller assigns', () => {
    const fields = { 'path': '/tmp/lock', 'timeoutMs': 1000 };
    let received: Readonly<typeof fields> | undefined;
    DomainErrorArgs.build(fields, {
      'code': 'fileLock.timeout',
      'message': (f) => {
        received = f;
        return 'timed out';
      }
    });
    strictEqual(received, fields);
  });
});
