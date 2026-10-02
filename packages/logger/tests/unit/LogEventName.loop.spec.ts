import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { EVENT_COMPONENTS } from '../../src/constants/EVENT_COMPONENTS.js';
import { LogEventName } from '../../src/modules/LogEventName.js';
import { LogEventNameScenarioCaseEntity } from './entities/LogEventNameScenarioCaseEntity.js';
import scenarioGroups from './LogEventName.scenarios.json' with { 'type': 'json' };

class LogEventNameRunners {
  static 'component-prefixes'(scenarioCase: Extract<LogEventNameScenarioCaseEntity.Type, { 'shape': 'component-prefixes' }>): void {
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
  }

  static 'create-constant-component'(scenarioCase: Extract<LogEventNameScenarioCaseEntity.Type, { 'shape': 'create-constant-component' }>): void {
    assert.strictEqual(LogEventName.create(scenarioCase.input.component, scenarioCase.input.operation), scenarioCase.expected);
  }

  static 'create-graph-query'(scenarioCase: Extract<LogEventNameScenarioCaseEntity.Type, { 'shape': 'create-graph-query' }>): void {
    assert.strictEqual(LogEventName.create(scenarioCase.input.component, scenarioCase.input.operation), scenarioCase.expected);
  }

  static 'create-query-planner'(scenarioCase: Extract<LogEventNameScenarioCaseEntity.Type, { 'shape': 'create-query-planner' }>): void {
    assert.strictEqual(LogEventName.create(scenarioCase.input.component, scenarioCase.input.operation), scenarioCase.expected);
  }

  static 'parse-graph-query'(scenarioCase: Extract<LogEventNameScenarioCaseEntity.Type, { 'shape': 'parse-graph-query' }>): void {
    assert.deepStrictEqual(LogEventName.parse(scenarioCase.input.event), scenarioCase.expected);
  }

  static 'parse-multiple-dots'(scenarioCase: Extract<LogEventNameScenarioCaseEntity.Type, { 'shape': 'parse-multiple-dots' }>): void {
    assert.deepStrictEqual(LogEventName.parse(scenarioCase.input.event), scenarioCase.expected);
  }

  static 'parse-query-planner'(scenarioCase: Extract<LogEventNameScenarioCaseEntity.Type, { 'shape': 'parse-query-planner' }>): void {
    assert.deepStrictEqual(LogEventName.parse(scenarioCase.input.event), scenarioCase.expected);
  }

  static 'parse-standalone'(scenarioCase: Extract<LogEventNameScenarioCaseEntity.Type, { 'shape': 'parse-standalone' }>): void {
    assert.deepStrictEqual(LogEventName.parse(scenarioCase.input.event), scenarioCase.expected);
  }
}

ScenarioSuite.register({
  'entity': LogEventNameScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'LogEventName',
  'runners': LogEventNameRunners
});
