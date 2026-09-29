/** scenario-intake — ExampleScenarioFileEntity.intake validates a Northstar Books scenario file and reports how each case dispatches by shape. Run: npx tsx packages/example-smoke-kit/examples/scenario-intake.ts */

import assert from 'node:assert/strict';

// #region usage
import { ExampleScenarioFileEntity } from '../src/entities/index.js';

const scenarioFile = ExampleScenarioFileEntity.intake({
  'cases': [
    {
      'description': 'the catalog search example runs without throwing',
      'expected': { 'importsWithoutThrow': true },
      'input': { 'file': '../../examples/catalog-search.ts' },
      'name': 'catalog-search',
      'shape': 'imports-example'
    },
    {
      'description': 'the order tracker example is registered for the docs playground',
      'expected': { 'registeredInDocsPlayground': true },
      'input': { 'file': 'packages/northstar-books/examples/order-tracker' },
      'name': 'order-tracker',
      'shape': 'browser-example'
    }
  ]
});

for (const scenario of scenarioFile.cases) {
  console.log(`${scenario.name} dispatches as ${scenario.shape}`);
}

assert.equal(scenarioFile.cases.length, 2);
assert.deepEqual(scenarioFile.cases.map((scenario) => { return scenario.shape; }), ['imports-example', 'browser-example']);
// #endregion usage
