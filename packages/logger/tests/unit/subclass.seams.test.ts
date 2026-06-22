// Tests for subclass-extension seams added to @studnicky/logger
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import type { CapturedLogEntryType } from '../../src/interfaces/CapturedLogEntryType.js';
import type { LoggerInterface } from '../../src/interfaces/LoggerInterface.js';
import type { SpyStateType } from '../../src/interfaces/SpyStateType.js';
import { ConsoleLogger } from '../../src/modules/ConsoleLogger.js';
import { NoOpLogger } from '../../src/modules/NoOpLogger.js';
import { SpyLogger } from '../../src/modules/SpyLogger.js';
import type { LogDataType } from '../../src/types/LogDataType.js';
import type { LogLevelType } from '../../src/types/LogLevelType.js';

import { TestFactory } from './TestFactory.js';

// ---------------------------------------------------------------------------
// JsonConsoleLogger — overrides emit to redirect output to a local array
// ---------------------------------------------------------------------------

class JsonConsoleLogger extends ConsoleLogger {
  captured: Array<{ level: LogLevelType; message: string }> = [];

  protected override initChild(child: this): void {
    // Each child needs its own captured array — it is NOT shared with the parent
    child.captured = [];
  }

  protected override emit(level: LogLevelType, formattedMessage: string, _data: LogDataType): void {
    this.captured.push({ level, message: formattedMessage });
  }
}

// ---------------------------------------------------------------------------
// FilterLogger — overrides shouldLog to block a specific level
// ---------------------------------------------------------------------------

class FilterLogger extends ConsoleLogger {
  readonly logged: string[] = [];
  private readonly blockedLevel: LogLevelType;

  constructor(blockedLevel: LogLevelType) {
    super({ level: LogLevel.TRACE });
    this.blockedLevel = blockedLevel;
  }

  protected override shouldLog(level: LogLevelType): boolean {
    return level !== this.blockedLevel;
  }

  protected override emit(_level: LogLevelType, formattedMessage: string, _data: LogDataType): void {
    this.logged.push(formattedMessage);
  }
}

// ---------------------------------------------------------------------------
// TaggedSpyLogger — overrides buildEntry to prefix messages
// ---------------------------------------------------------------------------

class TaggedSpyLogger extends SpyLogger {
  static wrapTagged(logger: LoggerInterface): TaggedSpyLogger {
    return new TaggedSpyLogger(logger, { 'buffer': [] }, {});
  }

  protected override buildEntry(level: string, data: LogDataType): CapturedLogEntryType {
    const base = super.buildEntry(level, data);
    return { ...base, 'message': `[tagged] ${base.message}` };
  }
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

void describe('subclass seams', () => {

  void describe('JsonConsoleLogger — emit override', () => {
    void it('extends ConsoleLogger', () => {
      const logger = new JsonConsoleLogger({ level: LogLevel.TRACE });
      assert.ok(logger instanceof ConsoleLogger);
      assert.ok(logger instanceof JsonConsoleLogger);
    });

    void it('redirects info() to captured array instead of console', () => {
      const logger = new JsonConsoleLogger({ level: LogLevel.TRACE });
      const body = TestFactory.body('hello from emit');

      logger.info(body);

      assert.strictEqual(logger.captured.length, 1);
      assert.strictEqual(logger.captured[0]?.level, LogLevel.INFO);
      assert.strictEqual(logger.captured[0]?.message, 'hello from emit');
    });

    void it('child() returns a JsonConsoleLogger instance', () => {
      const logger = new JsonConsoleLogger({ level: LogLevel.TRACE });
      const child = logger.child({ requestId: 'abc' });

      assert.ok(child instanceof JsonConsoleLogger, 'child should be JsonConsoleLogger');
      assert.ok(child instanceof ConsoleLogger, 'child should also be ConsoleLogger');
    });

    void it('child emit is also redirected', () => {
      const logger = new JsonConsoleLogger({ level: LogLevel.TRACE });
      const child = logger.child({ requestId: 'abc' });
      const body = TestFactory.body('child message');

      child.info(body);

      // The child has its own captured array
      assert.strictEqual(child.captured.length, 1);
      assert.strictEqual(child.captured[0]?.level, LogLevel.INFO);
    });

    void it('child inherits level filtering', () => {
      const logger = new JsonConsoleLogger({ level: LogLevel.WARN });
      const child = logger.child({ requestId: 'abc' });
      const body = TestFactory.body('should be filtered');

      child.info(body);

      assert.strictEqual(child.captured.length, 0, 'info should be filtered at WARN level');
    });
  });

  void describe('FilterLogger — shouldLog override', () => {
    void it('blocks the specified level', () => {
      const logger = new FilterLogger(LogLevel.INFO);
      const body = TestFactory.body('blocked info');

      logger.info(body);

      assert.strictEqual(logger.logged.length, 0, 'info should be blocked');
    });

    void it('passes other levels through', () => {
      const logger = new FilterLogger(LogLevel.INFO);
      const body = TestFactory.body('allowed warn');

      logger.warn(body);

      assert.strictEqual(logger.logged.length, 1, 'warn should be logged');
      assert.strictEqual(logger.logged[0], 'allowed warn');
    });
  });

  void describe('TaggedSpyLogger — buildEntry override', () => {
    void it('creates instance via wrapTagged', () => {
      const spy = TaggedSpyLogger.wrapTagged(NoOpLogger.create());
      assert.ok(spy instanceof SpyLogger);
      assert.ok(spy instanceof TaggedSpyLogger);
    });

    void it('prefixes captured message with [tagged]', () => {
      const spy = TaggedSpyLogger.wrapTagged(NoOpLogger.create());
      const body = TestFactory.body('my message');

      spy.info(body);

      assert.strictEqual(spy.entries.length, 1);
      assert.ok(spy.entries[0]?.message.startsWith('[tagged]'), `expected [tagged] prefix, got: ${spy.entries[0]?.message}`);
    });

    void it('child() of TaggedSpyLogger also prefixes entries', () => {
      const spy = TaggedSpyLogger.wrapTagged(NoOpLogger.create());
      const child = spy.child({ service: 'test' }) as TaggedSpyLogger;
      const body = TestFactory.body('child tagged');

      child.info(body);

      // children share the buffer
      assert.strictEqual(spy.entries.length, 1);
      assert.ok(spy.entries[0]?.message.startsWith('[tagged]'), `expected [tagged] prefix in shared buffer`);
    });
  });

  void describe('SpyStateType export', () => {
    void it('SpyStateType is accessible for subclass construction', () => {
      // If SpyStateType were not exported, this compile-time check would fail.
      // We verify at runtime by directly constructing with a typed state object.
      const state: SpyStateType = { 'buffer': [] };
      const spy = new TaggedSpyLogger(NoOpLogger.create(), state, {});

      spy.info(TestFactory.body('direct state'));

      assert.strictEqual(state.buffer.length, 1);
    });
  });
});
