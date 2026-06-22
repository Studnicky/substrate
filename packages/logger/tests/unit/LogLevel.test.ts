import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { LogLevelMap } from '../../src/constants/LogLevelMap.js';
import { parseLogLevel } from '../../src/index.js';

void describe('LogLevel', () => {
  void describe('enum values', () => {
    void it('should have correct numeric values', () => {
      assert.strictEqual(LogLevel.TRACE, 0);
      assert.strictEqual(LogLevel.DEBUG, 1);
      assert.strictEqual(LogLevel.INFO, 2);
      assert.strictEqual(LogLevel.WARN, 3);
      assert.strictEqual(LogLevel.ERROR, 4);
      assert.strictEqual(LogLevel.SILENT, 5);
    });

    void it('should be ordered by severity', () => {
      const levels = [
        LogLevel.TRACE,
        LogLevel.DEBUG,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
        LogLevel.SILENT
      ];

      for (let index = 0; index < levels.length - 1; index++) {
        const current = levels[index];
        const next = levels[index + 1];

        assert.ok(current !== undefined && next !== undefined);
        assert.ok(current < next);
      }
    });
  });

  void describe('LogLevelMap', () => {
    void it('should map string to enum values', () => {
      assert.strictEqual(LogLevelMap.trace, LogLevel.TRACE);
      assert.strictEqual(LogLevelMap.debug, LogLevel.DEBUG);
      assert.strictEqual(LogLevelMap.info, LogLevel.INFO);
      assert.strictEqual(LogLevelMap.warn, LogLevel.WARN);
      assert.strictEqual(LogLevelMap.error, LogLevel.ERROR);
      assert.strictEqual(LogLevelMap.silent, LogLevel.SILENT);
    });
  });

  void describe('parseLogLevel', () => {
    void it('should return numeric value unchanged', () => {
      assert.strictEqual(parseLogLevel(LogLevel.TRACE), LogLevel.TRACE);
      assert.strictEqual(parseLogLevel(LogLevel.DEBUG), LogLevel.DEBUG);
      assert.strictEqual(parseLogLevel(LogLevel.INFO), LogLevel.INFO);
      assert.strictEqual(parseLogLevel(LogLevel.WARN), LogLevel.WARN);
      assert.strictEqual(parseLogLevel(LogLevel.ERROR), LogLevel.ERROR);
      assert.strictEqual(parseLogLevel(LogLevel.SILENT), LogLevel.SILENT);
    });

    void it('should parse string values', () => {
      assert.strictEqual(parseLogLevel('trace'), LogLevel.TRACE);
      assert.strictEqual(parseLogLevel('debug'), LogLevel.DEBUG);
      assert.strictEqual(parseLogLevel('info'), LogLevel.INFO);
      assert.strictEqual(parseLogLevel('warn'), LogLevel.WARN);
      assert.strictEqual(parseLogLevel('error'), LogLevel.ERROR);
      assert.strictEqual(parseLogLevel('silent'), LogLevel.SILENT);
    });

    void it('should return INFO for invalid string', () => {
      assert.strictEqual(parseLogLevel('invalid' as 'info'), LogLevel.INFO);
      assert.strictEqual(parseLogLevel('DEBUG' as 'info'), LogLevel.INFO);
      assert.strictEqual(parseLogLevel('' as 'info'), LogLevel.INFO);
    });
  });
});
