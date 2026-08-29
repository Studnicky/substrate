import { RuntimeError } from '@studnicky/errors';
/** custom-error — build a configuration error with an Error cause. Run: npx tsx packages/config/examples/custom-error.ts */
import assert from 'node:assert/strict';

// #region usage
import { ConfigurationError } from '../src/index.js';

const cause = RuntimeError.create('environment variable CONFIG_URL is not set');
const configurationError = ConfigurationError.create('configuration is invalid', cause);

console.log('Configuration error:', configurationError.message);
console.log('Cause:', configurationError.cause);
// #endregion usage

assert.equal(configurationError.message, 'configuration is invalid');
assert.strictEqual(configurationError.cause, cause);

console.log('custom-error: all assertions passed');
