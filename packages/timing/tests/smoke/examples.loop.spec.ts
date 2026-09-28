import { ExampleSmokeRunner } from '@studnicky/example-smoke-kit/node';

import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

ExampleSmokeRunner.registerExampleSmokeSuite(scenarioGroups, { 'packageName': 'timing', 'specUrl': import.meta.url });
