import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { EVENT_COMPONENTS } from '../../src/constants/EVENT_COMPONENTS.js';
import { LogEventName } from '../../src/modules/LogEventName.js';
import scenarioGroups from './LogEventName.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: {
        components: typeof EVENT_COMPONENTS;
      };
      input: Record<string, never>;
      shape: 'component-prefixes';
    }
  | {
      description: string;
      expected: string;
      input: {
        component: string;
        operation: string;
      };
      shape: 'create-graph-query';
    }
  | {
      description: string;
      expected: string;
      input: {
        component: string;
        operation: string;
      };
      shape: 'create-query-planner';
    }
  | {
      description: string;
      expected: string;
      input: {
        component: string;
        operation: string;
      };
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
      shape: 'parse-standalone';
    };

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
  'component-prefixes': (scenarioCase) => {
    assert.deepStrictEqual(scenarioCase.input.components, scenarioCase.expected.components);
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

void describe('LogEventName', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runnerMap[scenario.shape](scenario);
    });
  }
});
