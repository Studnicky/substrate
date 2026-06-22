import type { LogLevelType } from '../../src/types/LogLevelType.js';

import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';


import { LogLevel } from '../../src/constants/LogLevel.js';
import { parseLogLevel } from '../../src/modules/parseLogLevel.js';

void describe('parseLogLevel utility', () => {
  void describe('numeric LogLevel input', () => {
    void it('should return TRACE for LogLevel.TRACE', () => {
      const result = parseLogLevel(LogLevel.TRACE);

      assert.strictEqual(result, LogLevel.TRACE);
      assert.strictEqual(result, 0);
    });

    void it('should return DEBUG for LogLevel.DEBUG', () => {
      const result = parseLogLevel(LogLevel.DEBUG);

      assert.strictEqual(result, LogLevel.DEBUG);
      assert.strictEqual(result, 1);
    });

    void it('should return INFO for LogLevel.INFO', () => {
      const result = parseLogLevel(LogLevel.INFO);

      assert.strictEqual(result, LogLevel.INFO);
      assert.strictEqual(result, 2);
    });

    void it('should return WARN for LogLevel.WARN', () => {
      const result = parseLogLevel(LogLevel.WARN);

      assert.strictEqual(result, LogLevel.WARN);
      assert.strictEqual(result, 3);
    });

    void it('should return ERROR for LogLevel.ERROR', () => {
      const result = parseLogLevel(LogLevel.ERROR);

      assert.strictEqual(result, LogLevel.ERROR);
      assert.strictEqual(result, 4);
    });

    void it('should return SILENT for LogLevel.SILENT', () => {
      const result = parseLogLevel(LogLevel.SILENT);

      assert.strictEqual(result, LogLevel.SILENT);
      assert.strictEqual(result, 5);
    });
  });

  void describe('string LogLevelString input', () => {
    void it('should parse "trace" to LogLevel.TRACE', () => {
      const result = parseLogLevel('trace');

      assert.strictEqual(result, LogLevel.TRACE);
      assert.strictEqual(result, 0);
    });

    void it('should parse "debug" to LogLevel.DEBUG', () => {
      const result = parseLogLevel('debug');

      assert.strictEqual(result, LogLevel.DEBUG);
      assert.strictEqual(result, 1);
    });

    void it('should parse "info" to LogLevel.INFO', () => {
      const result = parseLogLevel('info');

      assert.strictEqual(result, LogLevel.INFO);
      assert.strictEqual(result, 2);
    });

    void it('should parse "warn" to LogLevel.WARN', () => {
      const result = parseLogLevel('warn');

      assert.strictEqual(result, LogLevel.WARN);
      assert.strictEqual(result, 3);
    });

    void it('should parse "error" to LogLevel.ERROR', () => {
      const result = parseLogLevel('error');

      assert.strictEqual(result, LogLevel.ERROR);
      assert.strictEqual(result, 4);
    });

    void it('should parse "silent" to LogLevel.SILENT', () => {
      const result = parseLogLevel('silent');

      assert.strictEqual(result, LogLevel.SILENT);
      assert.strictEqual(result, 5);
    });
  });

  void describe('default behavior for invalid input', () => {
    void it('should return INFO for empty string', () => {
      const result = parseLogLevel('' as 'info');

      assert.strictEqual(result, LogLevel.INFO);
    });

    void it('should return INFO for invalid string', () => {
      const result = parseLogLevel('invalid' as 'info');

      assert.strictEqual(result, LogLevel.INFO);
    });

    void it('should return INFO for uppercase string', () => {
      const result = parseLogLevel('DEBUG' as 'debug');

      assert.strictEqual(result, LogLevel.INFO);
    });

    void it('should return INFO for mixed case string', () => {
      const result = parseLogLevel('Info' as 'info');

      assert.strictEqual(result, LogLevel.INFO);
    });

    void it('should return INFO for string with spaces', () => {
      const result = parseLogLevel(' info ' as 'info');

      assert.strictEqual(result, LogLevel.INFO);
    });
  });

  void describe('type checking behavior', () => {
    void it('should handle numeric 0 as TRACE', () => {
      const result = parseLogLevel(0);

      assert.strictEqual(result, LogLevel.TRACE);
    });

    void it('should handle numeric 1 as DEBUG', () => {
      const result = parseLogLevel(1);

      assert.strictEqual(result, LogLevel.DEBUG);
    });

    void it('should handle numeric 2 as INFO', () => {
      const result = parseLogLevel(2);

      assert.strictEqual(result, LogLevel.INFO);
    });

    void it('should handle numeric 3 as WARN', () => {
      const result = parseLogLevel(3);

      assert.strictEqual(result, LogLevel.WARN);
    });

    void it('should handle numeric 4 as ERROR', () => {
      const result = parseLogLevel(4);

      assert.strictEqual(result, LogLevel.ERROR);
    });

    void it('should handle numeric 5 as SILENT', () => {
      const result = parseLogLevel(5);

      assert.strictEqual(result, LogLevel.SILENT);
    });
  });

  void describe('consistency with LogLevel enum', () => {
    void it('should maintain correct ordering', () => {
      assert.ok(parseLogLevel('trace') < parseLogLevel('debug'));
      assert.ok(parseLogLevel('debug') < parseLogLevel('info'));
      assert.ok(parseLogLevel('info') < parseLogLevel('warn'));
      assert.ok(parseLogLevel('warn') < parseLogLevel('error'));
      assert.ok(parseLogLevel('error') < parseLogLevel('silent'));
    });

    void it('should match enum values exactly', () => {
      assert.strictEqual(parseLogLevel('trace'), LogLevel.TRACE);
      assert.strictEqual(parseLogLevel('debug'), LogLevel.DEBUG);
      assert.strictEqual(parseLogLevel('info'), LogLevel.INFO);
      assert.strictEqual(parseLogLevel('warn'), LogLevel.WARN);
      assert.strictEqual(parseLogLevel('error'), LogLevel.ERROR);
      assert.strictEqual(parseLogLevel('silent'), LogLevel.SILENT);
    });

    void it('should be idempotent for numeric values', () => {
      const trace = parseLogLevel(LogLevel.TRACE);
      const traceTwice = parseLogLevel(trace);

      assert.strictEqual(trace, traceTwice);

      const info = parseLogLevel(LogLevel.INFO);
      const infoTwice = parseLogLevel(info);

      assert.strictEqual(info, infoTwice);
    });

    void it('should be idempotent for string values', () => {
      const debug = parseLogLevel('debug');
      const debugTwice = parseLogLevel(debug);

      assert.strictEqual(debug, debugTwice);

      const error = parseLogLevel('error');
      const errorTwice = parseLogLevel(error);

      assert.strictEqual(error, errorTwice);
    });
  });

  void describe('edge case inputs', () => {
    void it('should handle numeric inputs outside valid range', () => {
      const result1 = parseLogLevel(-1 as LogLevelType);
      const result2 = parseLogLevel(999 as LogLevelType);

      assert.strictEqual(result1, -1);
      assert.strictEqual(result2, 999);
    });

    void it('should default to INFO for any unrecognized string', () => {
      const testCases = [
        'fatal',
        'critical',
        'emergency',
        'notice',
        'verbose'
      ];

      for (const testCase of testCases) {
        const result = parseLogLevel(testCase as 'info');

        assert.strictEqual(result, LogLevel.INFO);
      }
    });
  });

  void describe('return type verification', () => {
    void it('should always return a number', () => {
      const results = [
        parseLogLevel('trace'),
        parseLogLevel('debug'),
        parseLogLevel('info'),
        parseLogLevel('warn'),
        parseLogLevel('error'),
        parseLogLevel('silent'),
        parseLogLevel(LogLevel.TRACE),
        parseLogLevel(LogLevel.DEBUG),
        parseLogLevel(LogLevel.INFO)
      ];

      for (const result of results) {
        assert.strictEqual(typeof result, 'number');
      }
    });

    void it('should return valid LogLevel enum values for valid inputs', () => {
      const validLevels = new Set([
        LogLevel.DEBUG,
        LogLevel.ERROR,
        LogLevel.INFO,
        LogLevel.SILENT,
        LogLevel.TRACE,
        LogLevel.WARN
      ]);

      const parsedLevels = [
        parseLogLevel('trace'),
        parseLogLevel('debug'),
        parseLogLevel('info'),
        parseLogLevel('warn'),
        parseLogLevel('error'),
        parseLogLevel('silent')
      ];

      for (const level of parsedLevels) {
        assert.ok(validLevels.has(level));
      }
    });
  });
});
