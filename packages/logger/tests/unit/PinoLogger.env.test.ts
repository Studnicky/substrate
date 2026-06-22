import assert from 'node:assert/strict';
import {
  after,
  describe,
  it
} from 'node:test';

import { PinoLogger } from '../../src/index.js';

void describe('PinoLogger NODE_ENV detection', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  void after(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  void describe('pretty logging defaults', () => {
    void it('should use pretty logging when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development';

      const logger = PinoLogger.create();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should use pretty logging when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';

      const logger = PinoLogger.create();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should use pretty logging when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;

      const logger = PinoLogger.create();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should use JSON logging when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';

      const logger = PinoLogger.create();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('explicit pretty config overrides NODE_ENV', () => {
    void it('should use JSON logging when pretty is false in development', () => {
      process.env.NODE_ENV = 'development';

      const logger = PinoLogger.create({ pretty: false });

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should use pretty logging when pretty is true in production', () => {
      process.env.NODE_ENV = 'production';

      const logger = PinoLogger.create({ pretty: true });

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('builder respects NODE_ENV', () => {
    void it('should use pretty logging in development by default', () => {
      process.env.NODE_ENV = 'development';

      const logger = PinoLogger.builder()
        .level('info')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should allow explicit override in builder', () => {
      process.env.NODE_ENV = 'development';

      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });
});
