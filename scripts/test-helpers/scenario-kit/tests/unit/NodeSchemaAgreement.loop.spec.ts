import { RuntimeError } from '@studnicky/errors/browser';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../src/types/ScenarioCaseOfType.js';

import { ScenarioSuite } from '../../src/node/ScenarioSuite.js';
import { NodeSchemaAgreement } from '../../src/NodeSchemaAgreement.js';
import { ScenarioValues } from '../../src/ScenarioValues.js';
import { NodeSchemaAgreementScenarioCaseEntity } from './entities/NodeSchemaAgreementScenarioCaseEntity.js';
import { AgreementPairFixtures } from './fixtures/AgreementPairFixtures.js';
import scenarioGroups from './NodeSchemaAgreement.scenarios.json' with { 'type': 'json' };

class NodeSchemaAgreementRunners {
  static 'matches'(scenarioCase: ScenarioCaseOfType<NodeSchemaAgreementScenarioCaseEntity.Type, 'matches'>): void {
    const pair = ScenarioValues.requireDefined(AgreementPairFixtures.pairs.get(scenarioCase.input.pair), `pair ${scenarioCase.input.pair}`);
    NodeSchemaAgreement.assertMatches(pair.schema, pair.node);
  }

  static 'rejects'(scenarioCase: ScenarioCaseOfType<NodeSchemaAgreementScenarioCaseEntity.Type, 'rejects'>): void {
    const pair = ScenarioValues.requireDefined(AgreementPairFixtures.pairs.get(scenarioCase.input.pair), `pair ${scenarioCase.input.pair}`);
    assert.throws(
      () => {
        NodeSchemaAgreement.assertMatches(pair.schema, pair.node);
      },
      (error: Error) => {
        assert.ok(error instanceof RuntimeError);
        assert.ok(error.message.includes(scenarioCase.expected.messageIncludes), error.message);
        return true;
      }
    );
  }
}

ScenarioSuite.register({
  'entity': NodeSchemaAgreementScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'NodeSchemaAgreement',
  'runners': NodeSchemaAgreementRunners
});
