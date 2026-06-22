// Run: npx tsx packages/eslint-config/examples/configUsage.ts
import assert from 'node:assert/strict';

import { createEslintConfig } from '../src/index.js';

const config = createEslintConfig();

assert(Array.isArray(config) && config.length > 0, 'createEslintConfig() must return a non-empty array');

const rulePluginNames = config
  .flatMap((entry) => Object.keys(entry.plugins ?? {}))
  .filter((name, index, arr) => arr.indexOf(name) === index)
  .sort();

console.log(`createEslintConfig() returned ${config.length} config entries`);
console.log(`Plugins registered: ${rulePluginNames.join(', ')}`);
console.log('Smoke test passed: factory returns a valid non-empty flat config array');
