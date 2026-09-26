import { ExampleSmokeRunner } from '@studnicky/example-smoke-kit/node';

import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

ExampleSmokeRunner.registerExampleSmokeSuite(scenarioGroups, { 'packageName': 'circular-buffer', 'specUrl': import.meta.url });
