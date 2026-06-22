/**
 * Example: Validating a configuration object
 * Run: npx tsx packages/config/examples/validate-config.ts
 */
import assert from 'node:assert/strict';
import {
  ConfigValidation,
  ConfigurationError,
  TypeGuards,
} from '../src/index.js';

class ConfigExample {
  static readonly knownKeys = new Set<string>(['host', 'port', 'debug', 'maxRetries']);

  static run(): void {
    ConfigExample.demonstrateValidPass();
    ConfigExample.demonstrateStringFailure();
    ConfigExample.demonstrateNumberFailure();
    ConfigExample.demonstrateUnknownKey();
    ConfigExample.demonstrateTypeGuards();
    ConfigExample.demonstrateNullSkip();
  }

  static demonstrateValidPass(): void {
    const config: Record<string, unknown> = {
      host: 'localhost',
      port: 8080,
      debug: false,
      maxRetries: 3,
    };

    ConfigValidation.assertNoUnknownKeys(config, ConfigExample.knownKeys);
    ConfigValidation.assertString(config['host'], 'host');
    ConfigValidation.assertNumber(config['port'], 'port');
    ConfigValidation.assertBoolean(config['debug'], 'debug');
    ConfigValidation.assertPositive(config['maxRetries'], 'maxRetries');
    // All assertions passed — no error thrown
  }

  static demonstrateStringFailure(): void {
    let caught: unknown;
    try {
      ConfigValidation.assertString(42, 'host');
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof ConfigurationError, 'Expected ConfigurationError');
    assert.equal((caught as ConfigurationError).message, 'host must be a string');
    assert.equal((caught as ConfigurationError).code, 'config.invalid');
  }

  static demonstrateNumberFailure(): void {
    let caught: unknown;
    try {
      ConfigValidation.assertNumber('not-a-number', 'port');
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof ConfigurationError, 'Expected ConfigurationError');
    assert.equal((caught as ConfigurationError).message, 'port must be a number');
  }

  static demonstrateUnknownKey(): void {
    const config: Record<string, unknown> = { host: 'localhost', unknownKey: true };
    let caught: unknown;
    try {
      ConfigValidation.assertNoUnknownKeys(config, ConfigExample.knownKeys);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof ConfigurationError, 'Expected ConfigurationError for unknown key');
    assert.ok(
      (caught as ConfigurationError).message.includes('unknownKey'),
      'Error message should name the unknown key',
    );
  }

  static demonstrateTypeGuards(): void {
    assert.equal(TypeGuards.isPositiveInteger(5), true);
    assert.equal(TypeGuards.isPositiveInteger(0), false);
    assert.equal(TypeGuards.isPositiveInteger(-1), false);
    assert.equal(TypeGuards.isPositiveInteger(1.5), false);

    assert.equal(TypeGuards.isObject({ key: 'value' }), true);
    assert.equal(TypeGuards.isObject(null), false);
    assert.equal(TypeGuards.isObject('string'), false);

    assert.equal(TypeGuards.isNonNegativeInteger(0), true);
    assert.equal(TypeGuards.isNonNegativeInteger(10), true);
    assert.equal(TypeGuards.isNonNegativeInteger(-1), false);

    assert.equal(TypeGuards.isFunction(() => {}), true);
    assert.equal(TypeGuards.isFunction('notafn'), false);
  }

  static demonstrateNullSkip(): void {
    // Assertions skip undefined/null — no error thrown
    ConfigValidation.assertString(undefined, 'optionalField');
    ConfigValidation.assertNumber(null, 'optionalCount');
    ConfigValidation.assertBoolean(undefined, 'optionalFlag');
  }
}

ConfigExample.run();
