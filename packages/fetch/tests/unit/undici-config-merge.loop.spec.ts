import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DispatcherAgent } from '../../src/config/DispatcherAgent.js';
import { ClientConfigDataEntity } from '../../src/entities/ClientConfigDataEntity.js';
import { DEFAULT_DISPATCHER_CONFIG } from '../../src/constants/DEFAULT_DISPATCHER_CONFIG.js';
import { FetchClient } from '../../src/modules/FetchClient.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';
import scenarioGroups from './undici-config-merge.scenarios.json' with { type: 'json' };

type RuntimeValue =
  | RuntimeValue[]
  | boolean
  | null
  | number
  | string
  | { [key: string]: RuntimeValue };

type MaterializedRuntimeValue =
  | MaterializedRuntimeValue[]
  | boolean
  | null
  | number
  | string
  | { [key: string]: MaterializedRuntimeValue };

type ExpectedOutcome = {
  shape: 'defaults' | 'dispatcher' | 'fetch-client' | 'ok' | 'throws';
  messageIncludes?: readonly string[];
  values?: Record<string, unknown>;
};

type ScenarioOperation = 'create-client' | 'create-dispatcher' | 'defaults' | 'validate-dispatcher';

type ScenarioCase = {
  description: string;
  expected: ExpectedOutcome;
  input: {
    dispatcher?: RuntimeValue;
    fetchClient?: RuntimeValue;
  };
  name: string;
  operation: ScenarioOperation;
};

type ScenarioAction = () => unknown;
type OperationFactory = (scenarioCase: ScenarioCase) => ScenarioAction;
type ExpectedOutcomeRunner = (scenarioCase: ScenarioCase, action: ScenarioAction) => void;

function materializeRuntimeValue(value: RuntimeValue | undefined): MaterializedRuntimeValue {
  if (value === undefined) {
    return {};
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      return materializeRuntimeValue(item);
    });
  }

  if (value !== null && typeof value === 'object') {
    const materialized: Record<string, MaterializedRuntimeValue> = {};

    for (const [key, entry] of Object.entries(value)) {
      materialized[key] = materializeRuntimeValue(entry);
    }

    return materialized;
  }

  return value;
}

function createDispatcher(config: MaterializedRuntimeValue): UndiciDispatcher {
  const clientConfig = ClientConfigDataEntity.intake({ 'dispatcher': config });
  const dispatcher = clientConfig.dispatcher;
  if (dispatcher === undefined) {
    throw new Error('dispatcher config must be present');
  }
  const agent = DispatcherAgent.create(dispatcher);
  return UndiciDispatcher.create(agent);
}

const operationMap: Record<ScenarioOperation, OperationFactory> = {
  'create-client': (scenarioCase) => {
    return () => {
      return Reflect.apply(FetchClient.create, FetchClient, [materializeRuntimeValue(scenarioCase.input.fetchClient)]);
    };
  },
  'create-dispatcher': (scenarioCase) => {
    return () => {
      return createDispatcher(materializeRuntimeValue(scenarioCase.input.dispatcher));
    };
  },
  defaults: () => {
    return () => {
      return DEFAULT_DISPATCHER_CONFIG;
    };
  },
  'validate-dispatcher': (scenarioCase) => {
    return () => {
      Reflect.apply(FetchClient.create, FetchClient, [{ 'dispatcher': materializeRuntimeValue(scenarioCase.input.dispatcher) }]);
    };
  }
};

const expectedOutcomeMap: Record<ExpectedOutcome['shape'], ExpectedOutcomeRunner> = {
  defaults: (scenarioCase) => {
    assert.ok(scenarioCase.expected.values !== undefined);

    for (const [key, value] of Object.entries(scenarioCase.expected.values)) {
      assert.strictEqual(Reflect.get(DEFAULT_DISPATCHER_CONFIG, key), value, key);
    }
  },
  dispatcher: (_scenarioCase, action) => {
    assert.ok(action() instanceof UndiciDispatcher);
  },
  'fetch-client': (_scenarioCase, action) => {
    assert.ok(action() instanceof FetchClient);
  },
  ok: (_scenarioCase, action) => {
    assert.doesNotThrow(action);
  },
  throws: (scenarioCase, action) => {
    const { messageIncludes } = scenarioCase.expected;
    assert.ok(messageIncludes !== undefined);
    assert.throws(action, (error: Error) => {
      assert.ok(error.message.length > 0);

      return true;
    });
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const action = operationMap[scenarioCase.operation](scenarioCase);
  expectedOutcomeMap[scenarioCase.expected.shape](scenarioCase, action);
}

void describe('pool configuration validation and merging', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
