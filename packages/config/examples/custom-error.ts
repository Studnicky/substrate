/**
 * Example: Custom error type via ConfigValidation subclass
 * Run: npx tsx packages/config/examples/custom-error.ts
 */
import assert from 'node:assert/strict';
import { ConfigValidation } from '../src/index.js';

class AppConfigValidation extends ConfigValidation {
  protected static override onValidationError(message: string): never {
    throw new Error(`[app] ${message}`);
  }
}

class CustomErrorExample {
  static run(): void {
    CustomErrorExample.demonstrateCustomPrefix();
    CustomErrorExample.demonstrateAllMethodsUseOverride();
  }

  static demonstrateCustomPrefix(): void {
    let caught: unknown;
    try {
      AppConfigValidation.assertString(123, 'apiKey');
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof Error, 'Expected an Error');
    assert.ok(
      (caught as Error).message.startsWith('[app]'),
      `Expected message to start with "[app]", got: ${(caught as Error).message}`,
    );
    assert.equal((caught as Error).message, '[app] apiKey must be a string');
  }

  static demonstrateAllMethodsUseOverride(): void {
    // assertNumber also routes through onValidationError
    let caught: unknown;
    try {
      AppConfigValidation.assertNumber('oops', 'timeout');
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof Error, 'Expected an Error');
    assert.equal((caught as Error).message, '[app] timeout must be a number');

    // assertBoolean as well
    let caughtBool: unknown;
    try {
      AppConfigValidation.assertBoolean(1, 'enabled');
    } catch (err) {
      caughtBool = err;
    }
    assert.ok(caughtBool instanceof Error, 'Expected an Error');
    assert.equal((caughtBool as Error).message, '[app] enabled must be a boolean');

    // Valid input still passes silently
    AppConfigValidation.assertString('valid', 'name');
    AppConfigValidation.assertNumber(42, 'count');
  }
}

CustomErrorExample.run();
