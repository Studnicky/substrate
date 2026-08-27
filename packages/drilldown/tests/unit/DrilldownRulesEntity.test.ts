import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { DataRecordInterface, DrillDownConfigEntity } from '../../src/index.js';

import { DrilldownRulesEntity, DrillDown } from '../../src/index.js';

/** Builds a `rules` tree nesting per-value rules `depth` levels deep, one string value per level. */
function buildNestedRules(depth: number): DrilldownRulesEntity.Type {
  if (depth === 0) {
    return {};
  }
  return {
    'group': [{
      'property': `level${depth}`,
      'values': [{ 'match': 'match', 'rules': buildNestedRules(depth - 1), 'type': 'string' }]
    }]
  };
}

it('DrilldownRulesEntity.validate accepts a rules tree nested 5 levels deep', () => {
  const rules = buildNestedRules(5);

  assert.ok(DrilldownRulesEntity.validate(rules));
});

it('DrilldownRulesEntity.validate rejects a structurally invalid value nested 3 levels deep', () => {
  const rules = buildNestedRules(3);
  // Corrupt the deepest 'group' rule (3 levels down) with a bogus, undeclared field.
  let cursor = rules;
  for (let i = 0; i < 2; i++) {
    cursor = cursor.group![0]!.values![0]!.rules!;
  }
  (cursor.group![0]! as unknown as { 'notAProperty': boolean }).notAProperty = true;
  delete (cursor.group![0]! as { 'property'?: string }).property;

  assert.equal(DrilldownRulesEntity.validate(rules), false);
});

it('DrillDown.group() honors per-value nested rules 4 levels deep end to end', () => {
  const records: DataRecordInterface[] = [];

  for (const region of ['east', 'west']) {
    for (const tier of ['gold', 'silver']) {
      for (const channel of ['online', 'retail']) {
        for (const status of ['open', 'closed']) {
          records.push({ 'channel': channel, 'region': region, 'status': status, 'tier': tier });
        }
      }
    }
  }

  const config: DrillDownConfigEntity.Type = {
    'minimumGroupSize': 0,
    'rules': {
      'group': [{
        'property': 'region',
        'values': [{
          'match': 'east',
          'rules': {
            'group': [{
              'property': 'tier',
              'values': [{
                'match': 'gold',
                'rules': {
                  'group': [{
                    'property': 'channel',
                    'values': [{
                      'match': 'online',
                      'rules': {
                        'group': [{ 'property': 'status', 'values': [{ 'match': 'open', 'type': 'string' }, { 'match': 'closed', 'type': 'string' }] }]
                      },
                      'type': 'string'
                    }]
                  }]
                },
                'type': 'string'
              }]
            }]
          },
          'type': 'string'
        }]
      }]
    }
  };

  const drilldown = new DrillDown();
  const tree = drilldown.group(records, config);

  // region=east -> tier=gold -> channel=online -> status={open,closed}: the 4th-level split.
  const eastNode = tree.grouped![0]!;
  const goldNode = eastNode.grouped![0]!;
  const onlineNode = goldNode.grouped![0]!;

  assert.equal(eastNode.value, 'east');
  assert.equal(goldNode.value, 'gold');
  assert.equal(onlineNode.value, 'online');
  assert.ok(onlineNode.grouped !== null);
  assert.deepEqual(onlineNode.grouped.map((child) => { return child.value; }), ['open', 'closed']);
  assert.equal(onlineNode.grouped[0]!.ungrouped?.length, 1);
});
