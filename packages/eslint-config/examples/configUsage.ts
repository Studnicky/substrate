/** configUsage — plugin smoke test. Run: npx tsx examples/configUsage.ts */

import assert from 'node:assert/strict';

// #region usage
import { plugin, v8Plugin } from '../src/index.js';

const config = {
  'plugins': {
    '@studnicky': plugin,
    '@studnicky/v8': v8Plugin
  },
  'rules': {
    '@studnicky/type-alias-must-end-type': 'error'
  }
};

const pluginRuleCount = Object.keys(plugin.rules).length;
const v8PluginRuleCount = Object.keys(v8Plugin.rules).length;

console.log(`@studnicky plugin rules: ${pluginRuleCount}`);
console.log(`@studnicky/v8 plugin rules: ${v8PluginRuleCount}`);
console.log(`Config plugins registered: ${Object.keys(config.plugins).join(', ')}`);
// #endregion usage

assert.ok('type-alias-must-end-type' in plugin.rules, 'plugin.rules must contain type-alias-must-end-type');
assert.ok(pluginRuleCount > 0, 'plugin.rules must be non-empty');
assert.ok(v8PluginRuleCount > 0, 'v8Plugin.rules must be non-empty');

console.log('configUsage: all assertions passed');
