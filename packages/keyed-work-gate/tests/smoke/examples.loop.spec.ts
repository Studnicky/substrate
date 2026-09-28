import { ExampleSmokeRunner } from '@studnicky/example-smoke-kit/node';

import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

ExampleSmokeRunner.registerExampleSmokeSuite(scenarioGroups, { 'packageName': 'keyed-work-gate', 'specUrl': import.meta.url });
