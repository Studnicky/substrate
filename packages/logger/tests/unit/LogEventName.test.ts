import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  EVENT_COMPONENTS
} from '../../src/constants/EVENT_COMPONENTS.js';
import {
  createEventName,
  parseEventName
} from '../../src/types/LogEventNameType.js';


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

  void describe('createEventName()', () => {
    void it('should create event from component and operation', () => {
      const event = createEventName('graph', 'query');

      assert.strictEqual(event, 'graph.query');
    });

    void it('should work with complex operation names', () => {
      const event = createEventName('queryPlanner', 'createPlan');

      assert.strictEqual(event, 'queryPlanner.createPlan');
    });

    void it('should work with EVENT_COMPONENTS constants', () => {
      const event = createEventName(EVENT_COMPONENTS.CACHE, 'get');

      assert.strictEqual(event, 'cache.get');
    });
  });

  void describe('parseEventName()', () => {
    void it('should parse event into component and operation', () => {
      const result = parseEventName('graph.query');

      assert.strictEqual(result.component, 'graph');
      assert.strictEqual(result.operation, 'query');
    });

    void it('should handle complex operation names', () => {
      const result = parseEventName('queryPlanner.createPlan');

      assert.strictEqual(result.component, 'queryPlanner');
      assert.strictEqual(result.operation, 'createPlan');
    });

    void it('should handle events with multiple dots', () => {
      const result = parseEventName('custom.nested.operation');

      assert.strictEqual(result.component, 'custom');
      assert.strictEqual(result.operation, 'nested.operation');
    });

    void it('should handle events without dots', () => {
      const result = parseEventName('standalone');

      assert.strictEqual(result.component, 'standalone');
      assert.strictEqual(result.operation, '');
    });
  });
});
