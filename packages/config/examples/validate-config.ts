/** validate-config — asserting required fields, type guards, and null-skip behaviour. Run: npx tsx packages/config/examples/validate-config.ts */

import assert from 'node:assert/strict';

// #region usage
import { ConfigurationError, ConfigValidation, Guard } from '../src/index.js';

const knownKeys = new Set<string>(['debug', 'host', 'maxRetries', 'port']);

// Valid config — all assertions pass silently
const config: Record<string, unknown> = {
  'debug': false,
  'host': 'localhost',
  'maxRetries': 3,
  'port': 8080
};

ConfigValidation.assertNoUnknownKeys(config, knownKeys);
ConfigValidation.assertString(config.host, 'host');
ConfigValidation.assertNumber(config.port, 'port');
ConfigValidation.assertBoolean(config.debug, 'debug');
ConfigValidation.assertPositive(config.maxRetries, 'maxRetries');

console.log('Config validated:', config);

// Type guards
console.log('isPositiveInteger(5):', Guard.isPositiveInteger(5));
console.log('isPositiveInteger(0):', Guard.isPositiveInteger(0));
console.log('isObject({}):', Guard.isObject({ 'key': 'value' }));
console.log('isObject(null):', Guard.isObject(null));
console.log('isNonNegativeInteger(0):', Guard.isNonNegativeInteger(0));
console.log('isFunction(fn):', Guard.isFunction(() => {}));

// Null/undefined inputs are skipped — no error thrown
ConfigValidation.assertString(undefined, 'optionalField');
ConfigValidation.assertNumber(null, 'optionalCount');
ConfigValidation.assertBoolean(undefined, 'optionalFlag');

// Invalid input throws ConfigurationError
let caughtString: ConfigurationError | undefined;
try {
  ConfigValidation.assertString(42, 'host');
} catch (err) {
  if (err instanceof ConfigurationError) {
    caughtString = err;
  }
}

let caughtNumber: ConfigurationError | undefined;
try {
  ConfigValidation.assertNumber('not-a-number', 'port');
} catch (err) {
  if (err instanceof ConfigurationError) {
    caughtNumber = err;
  }
}

let caughtUnknownKey: ConfigurationError | undefined;
try {
  ConfigValidation.assertNoUnknownKeys({ 'host': 'localhost', 'unknownKey': true }, knownKeys);
} catch (err) {
  if (err instanceof ConfigurationError) {
    caughtUnknownKey = err;
  }
}

console.log('assertString(42) threw:', caughtString?.message);
console.log('assertNumber("x") threw:', caughtNumber?.message);
console.log('assertNoUnknownKeys threw:', caughtUnknownKey?.message);
// #endregion usage

assert.equal(Guard.isPositiveInteger(5), true);
assert.equal(Guard.isPositiveInteger(0), false);
assert.equal(Guard.isPositiveInteger(-1), false);
assert.equal(Guard.isPositiveInteger(1.5), false);
assert.equal(Guard.isObject({ 'key': 'value' }), true);
assert.equal(Guard.isObject(null), false);
assert.equal(Guard.isObject('string'), false);
assert.equal(Guard.isObject([]), false);
assert.equal(Guard.isNonNegativeInteger(0), true);
assert.equal(Guard.isNonNegativeInteger(10), true);
assert.equal(Guard.isNonNegativeInteger(-1), false);
assert.equal(Guard.isFunction(() => {}), true);
assert.equal(Guard.isFunction('notafn'), false);

assert.ok(caughtString instanceof ConfigurationError, 'Expected ConfigurationError for string');
assert.equal(caughtString.message, 'host must be a string');
assert.equal(caughtString.code, 'config.invalid');

assert.ok(caughtNumber instanceof ConfigurationError, 'Expected ConfigurationError for number');
assert.equal(caughtNumber.message, 'port must be a number');

assert.ok(caughtUnknownKey instanceof ConfigurationError, 'Expected ConfigurationError for unknown key');
assert.ok(caughtUnknownKey.message.includes('unknownKey'));

console.log('validate-config: all assertions passed');
