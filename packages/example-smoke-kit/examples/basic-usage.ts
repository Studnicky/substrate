/** basic-usage — registerExampleSmokeSuite intakes a { cases: [...] } scenario file and registers one node:test case per entry, dispatching by shape. Run: npx tsx packages/example-smoke-kit/examples/basic-usage.ts */

// #region usage
import { ExampleSmokeRunner } from '../src/index.js';

const scenarioFile = {
  'cases': [
    {
      'description': 'the fixture example runs without throwing',
      'expected': { 'importsWithoutThrow': true },
      'input': { 'file': './fixtures/trivial-example.ts' },
      'name': 'trivial-example',
      'shape': 'imports-example'
    }
  ]
};

ExampleSmokeRunner.registerExampleSmokeSuite(scenarioFile, { 'packageName': 'example-smoke-kit', 'specUrl': import.meta.url });
// #endregion usage
