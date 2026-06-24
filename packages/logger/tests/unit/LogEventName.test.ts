import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  EVENT_COMPONENTS
} from '../../src/constants/EVENT_COMPONENTS.js';
import { LogEventName } from '../../src/modules/LogEventName.js';


void describe('LogEventName', () => {
  void describe('EVENT_COMPONENTS', () => {
    void it('should have all component prefixes', () => {
      assert.strictEqual(EVENT_COMPONENTS.API, 'api');
      assert.strictEqual(EVENT_COMPONENTS.AUTH, 'auth');
      assert.strictEqual(EVENT_COMPONENTS.QUERY_TRANSLATE, 'queryTranslate');
      assert.strictEqual(EVENT_COMPONENTS.QUERY_PLANNER, 'queryPlanner');
      assert.strictEqual(EVENT_COMPONENTS.QUERY_ROUTER, 'queryRouter');
      assert.strictEqual(EVENT_COMPONENTS.ONTOLOGY, 'ontology');
      assert.strictEqual(EVENT_COMPONENTS.GRAPH, 'graph');
      assert.strictEqual(EVENT_COMPONENTS.ENTITY, 'entity');
      assert.strictEqual(EVENT_COMPONENTS.CACHE, 'cache');
      assert.strictEqual(EVENT_COMPONENTS.DB, 'db');
      assert.strictEqual(EVENT_COMPONENTS.WORKFLOW, 'workflow');
      assert.strictEqual(EVENT_COMPONENTS.LLM, 'llm');
      assert.strictEqual(EVENT_COMPONENTS.DATA_SOURCE, 'dataSource');
      assert.strictEqual(EVENT_COMPONENTS.SCHEMA, 'schema');
    });
  });

  void describe('LogEventName.create()', () => {
    void it('should create event from component and operation', () => {
      const event = LogEventName.create('graph', 'query');

      assert.strictEqual(event, 'graph.query');
    });

    void it('should work with complex operation names', () => {
      const event = LogEventName.create('queryPlanner', 'createPlan');

      assert.strictEqual(event, 'queryPlanner.createPlan');
    });

    void it('should work with EVENT_COMPONENTS constants', () => {
      const event = LogEventName.create(EVENT_COMPONENTS.CACHE, 'get');

      assert.strictEqual(event, 'cache.get');
    });
  });

  void describe('LogEventName.parse()', () => {
    void it('should parse event into component and operation', () => {
      const result = LogEventName.parse('graph.query');

      assert.strictEqual(result.component, 'graph');
      assert.strictEqual(result.operation, 'query');
    });

    void it('should handle complex operation names', () => {
      const result = LogEventName.parse('queryPlanner.createPlan');

      assert.strictEqual(result.component, 'queryPlanner');
      assert.strictEqual(result.operation, 'createPlan');
    });

    void it('should handle events with multiple dots', () => {
      const result = LogEventName.parse('custom.nested.operation');

      assert.strictEqual(result.component, 'custom');
      assert.strictEqual(result.operation, 'nested.operation');
    });

    void it('should handle events without dots', () => {
      const result = LogEventName.parse('standalone');

      assert.strictEqual(result.component, 'standalone');
      assert.strictEqual(result.operation, '');
    });
  });
});
