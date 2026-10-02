import { ExampleSmokeRunner } from '../../src/index.js';
import scenarioGroups from './examples.scenarios.json' with { 'type': 'json' };

ExampleSmokeRunner.registerExampleSmokeSuite(scenarioGroups, { 'packageName': 'example-smoke-kit', 'specUrl': import.meta.url });
