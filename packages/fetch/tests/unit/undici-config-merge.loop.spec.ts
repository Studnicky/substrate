import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DispatcherAgent } from '../../src/config/DispatcherAgent.js';
import { ClientConfigDataEntity } from '../../src/entities/ClientConfigDataEntity.js';
import { DEFAULT_DISPATCHER_CONFIG } from '../../src/constants/DEFAULT_DISPATCHER_CONFIG.js';
import { FetchClient } from '../../src/modules/FetchClient.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';

import { UndiciConfigMergeScenarioCaseEntity } from './entities/UndiciConfigMergeScenarioCaseEntity.js';
import scenarioGroups from './undici-config-merge.scenarios.json' with { type: 'json' };

type ScenarioCase = UndiciConfigMergeScenarioCaseEntity.Type;
type ScenarioOperation = ScenarioCase['operation'];
type ExpectedOutcome = ScenarioCase['expected'];

const fileIntake = ScenarioFileCompiler.compileIntake(UndiciConfigMergeScenarioCaseEntity.Schema, UndiciConfigMergeScenarioCaseEntity.Node);

type ScenarioAction = () => unknown;
type OperationFactory = (scenarioCase: ScenarioCase) => ScenarioAction;
type ExpectedOutcomeRunner = (scenarioCase: ScenarioCase, action: ScenarioAction) => void;

function resolveInputObject(value: ScenarioCase['input']['dispatcher']): object {
  return value ?? {};
}

function createDispatcher(config: object): UndiciDispatcher {
  const clientConfig = ClientConfigDataEntity.intake({ 'dispatcher': config });
  const dispatcher = clientConfig.dispatcher;
  if (dispatcher === undefined) {
    throw RuntimeError.create('dispatcher config must be present');
  }
  const agent = DispatcherAgent.create(dispatcher);
  return UndiciDispatcher.create(agent);
}

const operationMap: Record<ScenarioOperation, OperationFactory> = {
  'create-client': (scenarioCase) => {
    return () => {
      return Reflect.apply(FetchClient.create, FetchClient, [resolveInputObject(scenarioCase.input.fetchClient)]);
    };
  },
  'create-dispatcher': (scenarioCase) => {
    return () => {
      return createDispatcher(resolveInputObject(scenarioCase.input.dispatcher));
    };
  },
  defaults: () => {
    return () => {
      return DEFAULT_DISPATCHER_CONFIG;
    };
  },
  'validate-dispatcher': (scenarioCase) => {
    return () => {
      Reflect.apply(FetchClient.create, FetchClient, [{ 'dispatcher': resolveInputObject(scenarioCase.input.dispatcher) }]);
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
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
