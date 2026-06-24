/** configUsage — createEslintConfig factory smoke test. Run: npx tsx examples/configUsage.ts */

import assert from 'node:assert/strict';

// #region usage
import { createEslintConfig } from '../src/index.js';

const config = createEslintConfig();

const rulePluginNames = config
  .flatMap((entry) => { const result = Object.keys(entry.plugins ?? {}); return result; })
  .filter((name, index, arr) => { return arr.indexOf(name) === index; })
  .sort();

console.log(`createEslintConfig() returned ${config.length} config entries`);
console.log(`Plugins registered: ${rulePluginNames.join(', ')}`);

const configWithOptions = createEslintConfig({ 'tsconfigRootDir': process.cwd() });

console.log(`createEslintConfig({ tsconfigRootDir }) returned ${configWithOptions.length} config entries`);
// #endregion usage

assert.ok(Array.isArray(config) && config.length > 0, 'createEslintConfig() must return a non-empty array');
assert.ok(
  rulePluginNames.includes('@studnicky') && rulePluginNames.includes('@typescript-eslint'),
  'expected @studnicky and @typescript-eslint plugins'
);
assert.ok(Array.isArray(configWithOptions) && configWithOptions.length === config.length, 'tsconfigRootDir option must not change entry count');

console.log('configUsage: all assertions passed');
