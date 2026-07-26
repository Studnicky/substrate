import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { EVENT_COMPONENTS } from '../../src/constants/EVENT_COMPONENTS.js';
import { LogEventName } from '../../src/modules/LogEventName.js';
import scenarioGroups from './LogEventName.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: {
        components: typeof EVENT_COMPONENTS;
      };
      input: Record<string, never>;
      name: string;
      shape: 'component-prefixes';
    }
  | {
      description: string;
      expected: string;
      input: {
        component: string;
        operation: string;
      };
      name: string;
      shape: 'create-graph-query';
    }
  | {
      description: string;
      expected: string;
      input: {
        component: string;
        operation: string;
      };
      name: string;
      shape: 'create-query-planner';
    }
  | {
      description: string;
      expected: string;
      input: {
        component: string;
        operation: string;
      };
      name: string;
      shape: 'create-constant-component';
    }
  | {
      description: string;
      expected: {
        component: string;
        operation: string;
      };
      input: {
        event: string;
      };
      name: string;
      shape: 'parse-graph-query';
    }
  | {
      description: string;
      expected: {
        component: string;
        operation: string;
      };
      input: {
        event: string;
      };
      name: string;
      shape: 'parse-query-planner';
    }
  | {
      description: string;
      expected: {
        component: string;
        operation: string;
      };
      input: {
        event: string;
      };
      name: string;
      shape: 'parse-multiple-dots';
    }
  | {
      description: string;
      expected: {
        component: string;
        operation: string;
      };
      input: {
        event: string;
      };
      name: string;
      shape: 'parse-standalone';
    };

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'component-prefixes': (scenarioCase) => {
    assert.strictEqual(scenarioCase.expected.components.API, EVENT_COMPONENTS.API);
    assert.strictEqual(scenarioCase.expected.components.AUTH, EVENT_COMPONENTS.AUTH);
    assert.strictEqual(scenarioCase.expected.components.QUERY_TRANSLATE, EVENT_COMPONENTS.QUERY_TRANSLATE);
    assert.strictEqual(scenarioCase.expected.components.QUERY_PLANNER, EVENT_COMPONENTS.QUERY_PLANNER);
    assert.strictEqual(scenarioCase.expected.components.QUERY_ROUTER, EVENT_COMPONENTS.QUERY_ROUTER);
    assert.strictEqual(scenarioCase.expected.components.ONTOLOGY, EVENT_COMPONENTS.ONTOLOGY);
    assert.strictEqual(scenarioCase.expected.components.GRAPH, EVENT_COMPONENTS.GRAPH);
    assert.strictEqual(scenarioCase.expected.components.ENTITY, EVENT_COMPONENTS.ENTITY);
    assert.strictEqual(scenarioCase.expected.components.CACHE, EVENT_COMPONENTS.CACHE);
    assert.strictEqual(scenarioCase.expected.components.DB, EVENT_COMPONENTS.DB);
    assert.strictEqual(scenarioCase.expected.components.WORKFLOW, EVENT_COMPONENTS.WORKFLOW);
    assert.strictEqual(scenarioCase.expected.components.LLM, EVENT_COMPONENTS.LLM);
    assert.strictEqual(scenarioCase.expected.components.DATA_SOURCE, EVENT_COMPONENTS.DATA_SOURCE);
    assert.strictEqual(scenarioCase.expected.components.SCHEMA, EVENT_COMPONENTS.SCHEMA);
    assert.strictEqual(scenarioCase.expected.components.TIMING, EVENT_COMPONENTS.TIMING);
  },
  'create-constant-component': (scenarioCase) => {
    assert.strictEqual(LogEventName.create(scenarioCase.input.component, scenarioCase.input.operation), scenarioCase.expected);
  },
  'create-graph-query': (scenarioCase) => {
    assert.strictEqual(LogEventName.create(scenarioCase.input.component, scenarioCase.input.operation), scenarioCase.expected);
  },
  'create-query-planner': (scenarioCase) => {
    assert.strictEqual(LogEventName.create(scenarioCase.input.component, scenarioCase.input.operation), scenarioCase.expected);
  },
  'parse-graph-query': (scenarioCase) => {
    assert.deepStrictEqual(LogEventName.parse(scenarioCase.input.event), scenarioCase.expected);
  },
  'parse-multiple-dots': (scenarioCase) => {
    assert.deepStrictEqual(LogEventName.parse(scenarioCase.input.event), scenarioCase.expected);
  },
  'parse-query-planner': (scenarioCase) => {
    assert.deepStrictEqual(LogEventName.parse(scenarioCase.input.event), scenarioCase.expected);
  },
  'parse-standalone': (scenarioCase) => {
    assert.deepStrictEqual(LogEventName.parse(scenarioCase.input.event), scenarioCase.expected);
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('LogEventName', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
