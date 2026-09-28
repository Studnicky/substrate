import { ExampleSmokeRunner } from '@studnicky/example-smoke-kit/node';

import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

ExampleSmokeRunner.registerExampleSmokeSuite(scenarioGroups, { 'packageName': 'file-lock', 'specUrl': import.meta.url });
