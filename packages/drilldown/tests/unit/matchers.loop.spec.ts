import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import type {
  GroupValueUnionType,
  MatchContextInterface,
  MatcherHandlerInterface,
  MatcherUnionType,
  PartitionGroupInterface
} from '../../src/index.js';

import { GroupValueDiscriminantEntity } from '../../src/index.js';
import { matcherRegistry } from '../../src/modules/matchers/index.js';
import scenarioCases from './matchers.scenarios.json' with { type: 'json' };

type MatcherType = GroupValueDiscriminantEntity.Type;
type ContextType = 'date' | 'numeric';

type ScenarioInput = {
  readonly 'context': ContextType;
  readonly 'numeric': number | null;
  readonly 'text': string;
  readonly 'type': MatcherType;
};

type MatchScenarioCase = {
  readonly 'description': string;
  readonly 'expected': { readonly 'matches': boolean };
  readonly 'input': ScenarioInput & { readonly 'matcher': MatcherUnionType };
  readonly 'name': string;
  readonly 'shape': 'match';
};

type CreateAndMatchScenarioCase = {
  readonly 'description': string;
  readonly 'expected': { readonly 'matches': boolean };
  readonly 'input': ScenarioInput & { readonly 'definition': GroupValueUnionType };
  readonly 'name': string;
  readonly 'shape': 'create-and-match';
};

type ScenarioCase = CreateAndMatchScenarioCase | MatchScenarioCase;

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  assert.ok(Predicates.isObject(value), `${name} must be an object`);
  return value;
}

function requireString(value: unknown, name: string): string {
  assert.ok(Predicates.isString(value), `${name} must be a string`);
  return value;
}

function requireNumber(value: unknown, name: string): number {
  assert.ok(Predicates.isNumber(value), `${name} must be a number`);
  return value;
}

function requireFiniteNumber(value: unknown, name: string): number {
  assert.ok(Predicates.isFiniteNumber(value), `${name} must be a finite number`);
  return value;
}

function requireNullableNumber(value: unknown, name: string): number | null {
  assert.ok(value === null || Predicates.isNumber(value), `${name} must be a number or null`);
  return value;
}

function requireBoolean(value: unknown, name: string): boolean {
  assert.ok(Predicates.isBoolean(value), `${name} must be a boolean`);
  return value;
}

function requireContext(value: unknown, name: string): ContextType {
  assert.ok(value === 'date' || value === 'numeric', `${name} must be a known context`);
  return value;
}

function requireMatcherType(value: unknown, name: string): MatcherType {
  assert.ok(
    value === 'alphabetic'
      || value === 'cidr'
      || value === 'date'
      || value === 'range'
      || value === 'semver'
      || value === 'sequential'
      || value === 'string',
    `${name} must be a registered matcher type`
  );
  return value;
}

function emptyGroup(): PartitionGroupInterface {
  return { 'groupValue': { 'match': 'placeholder', 'type': 'string' }, 'nodes': [], 'nodeValue': null };
}

function parseMatcher(value: unknown, type: MatcherType): MatcherUnionType {
  const record = requireRecord(value, 'scenario matcher');
  const group = emptyGroup();

  if (type === 'alphabetic') {
    return {
      'end': requireString(record['end'], 'scenario matcher end'),
      'group': group,
      'start': requireString(record['start'], 'scenario matcher start')
    };
  }
  if (type === 'cidr') {
    return {
      'end': requireNumber(record['end'], 'scenario matcher end'),
      'group': group,
      'start': requireNumber(record['start'], 'scenario matcher start')
    };
  }
  if (type === 'date') {
    return {
      'afterTs': requireNumber(record['afterTs'], 'scenario matcher afterTs'),
      'beforeTs': requireNumber(record['beforeTs'], 'scenario matcher beforeTs'),
      'group': group
    };
  }
  if (type === 'range') {
    return {
      'group': group,
      'maximum': requireNumber(record['maximum'], 'scenario matcher maximum'),
      'minimum': requireNumber(record['minimum'], 'scenario matcher minimum')
    };
  }
  if (type === 'semver') {
    return { 'group': group, 'range': requireString(record['range'], 'scenario matcher range') };
  }
  if (type === 'sequential') {
    return {
      'group': group,
      'maximum': requireNumber(record['maximum'], 'scenario matcher maximum'),
      'minimum': requireNumber(record['minimum'], 'scenario matcher minimum'),
      'prefix': requireString(record['prefix'], 'scenario matcher prefix'),
      'suffix': requireString(record['suffix'], 'scenario matcher suffix')
    };
  }

  return { 'group': group, 'match': requireString(record['match'], 'scenario matcher match') };
}

function parseDefinition(value: unknown, type: MatcherType): GroupValueUnionType {
  const record = requireRecord(value, 'scenario definition');
  const definitionType = requireMatcherType(record['type'], 'scenario definition type');
  assert.equal(definitionType, type, 'scenario definition type must match scenario input type');

  if (type === 'alphabetic') {
    return {
      'end': requireString(record['end'], 'scenario definition end'),
      'start': requireString(record['start'], 'scenario definition start'),
      'type': type
    };
  }
  if (type === 'cidr') {
    return { 'cidr': requireString(record['cidr'], 'scenario definition cidr'), 'type': type };
  }
  if (type === 'date') {
    return {
      'after': requireNumber(record['after'], 'scenario definition after'),
      'before': requireNumber(record['before'], 'scenario definition before'),
      'type': type
    };
  }
  if (type === 'range') {
    return {
      'maximum': requireNumber(record['maximum'], 'scenario definition maximum'),
      'minimum': requireNumber(record['minimum'], 'scenario definition minimum'),
      'type': type
    };
  }
  if (type === 'semver') {
    return { 'semver': requireString(record['semver'], 'scenario definition semver'), 'type': type };
  }
  if (type === 'sequential') {
    return {
      'sequential': {
        'maximum': requireNumber(record['maximum'], 'scenario definition maximum'),
        'minimum': requireNumber(record['minimum'], 'scenario definition minimum'),
        'padding': requireFiniteNumber(record['padding'], 'scenario definition padding'),
        'prefix': requireString(record['prefix'], 'scenario definition prefix'),
        'suffix': requireString(record['suffix'], 'scenario definition suffix')
      },
      'type': type
    };
  }

  return { 'match': requireString(record['match'], 'scenario definition match'), 'type': type };
}

function parseScenarioCase(value: unknown): ScenarioCase {
  const record = requireRecord(value, 'scenario case');
  const expected = requireRecord(record['expected'], 'scenario expected');
  const input = requireRecord(record['input'], 'scenario input');
  const type = requireMatcherType(input['type'], 'scenario input type');
  const baseInput: ScenarioInput = {
    'context': requireContext(input['context'], 'scenario input context'),
    'numeric': requireNullableNumber(input['numeric'], 'scenario input numeric'),
    'text': requireString(input['text'], 'scenario input text'),
    'type': type
  };
  const name = requireString(record['name'], 'scenario name');
  const description = requireString(record['description'], 'scenario description');
  const matches = requireBoolean(expected['matches'], 'scenario expected matches');
  const shape = requireString(record['shape'], 'scenario shape');

  if (shape === 'match') {
    return {
      'description': description,
      'expected': { 'matches': matches },
      'input': { ...baseInput, 'matcher': parseMatcher(input['matcher'], type) },
      'name': name,
      'shape': shape
    };
  }

  assert.equal(shape, 'create-and-match', `unknown scenario shape: ${shape}`);
  return {
    'description': description,
    'expected': { 'matches': matches },
    'input': { ...baseInput, 'definition': parseDefinition(input['definition'], type) },
    'name': name,
    'shape': shape
  };
}

function parseScenarioCases(value: unknown): readonly ScenarioCase[] {
  assert.ok(Predicates.isArray(value), 'matcher scenarios must be an array');
  const result: ScenarioCase[] = [];

  for (const scenarioCase of value) {
    result.push(parseScenarioCase(scenarioCase));
  }

  return result;
}

const parsedScenarioCases = parseScenarioCases(scenarioCases);

const numericContext: MatchContextInterface = {
  'toDateTimestamp': () => { return null; },
  'toStrictNumber': (value) => {
    const result = typeof value === 'number' ? value : null;

    return result;
  }
};

const dateContext: MatchContextInterface = {
  'toDateTimestamp': (value) => {
    const result = typeof value === 'number' ? value : null;

    return result;
  },
  'toStrictNumber': () => { return null; }
};

function contextFor(name: ContextType): MatchContextInterface {
  const result = name === 'date' ? dateContext : numericContext;

  return result;
}

function handlerFor(type: MatcherType): MatcherHandlerInterface {
  const handler = matcherRegistry.byType[type];
  assert.ok(handler !== undefined, `no matcher registered for type '${type}'`);

  return handler;
}

void describe('drilldown matchers', () => {
  for (const scenarioCase of parsedScenarioCases) {
    void it(`${scenarioCase.name}: ${scenarioCase.description}`, () => {
      const handler = handlerFor(scenarioCase.input.type);

      if (scenarioCase.shape === 'match') {
        const actual = handler.match(
          scenarioCase.input.matcher,
          scenarioCase.input.numeric,
          scenarioCase.input.text,
          contextFor(scenarioCase.input.context)
        );

        assert.equal(actual, scenarioCase.expected.matches);
        return;
      }

      const created = handler.createMatcher(scenarioCase.input.definition, emptyGroup());
      assert.ok(created !== null);
      const actual = handler.match(
        created,
        scenarioCase.input.numeric,
        scenarioCase.input.text,
        contextFor(scenarioCase.input.context)
      );

      assert.equal(actual, scenarioCase.expected.matches);
    });
  }
});
