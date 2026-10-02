import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { Hash } from '../../src/objects/Hash.js';
import { StructuralHash } from '../../src/objects/StructuralHash.js';
import { HEX_DIGEST_PATTERN } from '../fixtures/HEX_DIGEST_PATTERN.js';
import { HashScenarioCaseEntity } from './entities/HashScenarioCaseEntity.js';
import scenarioGroups from './hash.scenarios.json' with { 'type': 'json' };

interface RuntimeValueFactoryInterface {
  (): unknown;
}

/** Runtime values named by shape in the hash scenarios. */
class RuntimeValueShapes {
  static readonly factories: ReadonlyMap<string, RuntimeValueFactoryInterface> = new Map<string, RuntimeValueFactoryInterface>([
    ['array', () => {
      return [1, 2];
    }],
    ['date', () => {
      return new Date(0);
    }],
    ['false', () => {
      return false;
    }],
    ['function', () => {
      return () => {
        return 'hashable';
      };
    }],
    ['map', () => {
      return new Map([['a', 1]]);
    }],
    ['null', () => {
      return null;
    }],
    ['number', () => {
      return 1;
    }],
    ['object', () => {
      return {};
    }],
    ['set', () => {
      return new Set(['a']);
    }],
    ['string', () => {
      return 'value';
    }],
    ['true', () => {
      return true;
    }],
    ['undefined', () => {
      return undefined;
    }]
  ]);

  static materialize(shape: string): unknown {
    const factory = RuntimeValueShapes.factories.get(shape);
    assert.ok(factory !== undefined, `Unknown runtime value shape: ${shape}`);
    const value = factory();
    return value;
  }
}

class HashRunners {
  static 'hash-different'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'hash-different'>): void {
    const values = scenarioCase.input.json.values;
    assert.equal(Hash.value(values[0]) === Hash.value(values[1]), scenarioCase.expected.sameHash);
    assert.notEqual(Hash.value([1, 2]), Hash.value([1, 3]));
  }

  static 'hash-distinct-shapes'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'hash-distinct-shapes'>): void {
    const shapes = scenarioCase.input.json.values;
    const hashes: string[] = [];
    for (let index = 0; index < shapes.length; index += 1) {
      hashes.push(Hash.value(RuntimeValueShapes.materialize(String(shapes[index]))));
    }
    assert.equal(new Set(hashes).size === hashes.length, scenarioCase.expected.distinct);
  }

  static 'hash-edge-values'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'hash-edge-values'>): void {
    const [trueShape, falseShape, nullShape, stringShape] = scenarioCase.input.json.values.map(String);
    assert.equal(Hash.value(RuntimeValueShapes.materialize(String(trueShape))) !== Hash.value(RuntimeValueShapes.materialize(String(falseShape))), scenarioCase.expected.booleanDistinct);
    assert.equal(Hash.value(RuntimeValueShapes.materialize(String(nullShape))) !== Hash.value(RuntimeValueShapes.materialize(String(stringShape))), scenarioCase.expected.nullDistinctFromString);
  }

  static 'hash-hex'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'hash-hex'>): void {
    assert.match(Hash.value(scenarioCase.input.json.value), HEX_DIGEST_PATTERN);
  }

  static 'hash-identical'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'hash-identical'>): void {
    const values = scenarioCase.input.json.values;
    assert.equal(Hash.value(values[0]), Hash.value(values[1]));
  }

  static 'hash-nested'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'hash-nested'>): void {
    const value = scenarioCase.input.json.value;
    const changed = { 'a': { 'b': { 'c': 2 } } };
    assert.notEqual(Hash.value(value), Hash.value(changed));
  }

  static 'hash-order'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'hash-order'>): void {
    const values = scenarioCase.input.json.values;
    assert.deepStrictEqual(Object.keys(values[0] ?? {}), ['a', 'b']);
    assert.deepStrictEqual(Object.keys(values[1] ?? {}), ['b', 'a']);
    assert.equal(Hash.value(values[0]), Hash.value(values[1]));
  }

  static 'hash-primitive'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'hash-primitive'>): void {
    assert.equal(typeof Hash.value(scenarioCase.input.json.value), 'string');
  }

  static 'structural-hash-different'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'structural-hash-different'>): void {
    const input = scenarioCase.input.json;
    assert.notEqual(StructuralHash.of(input.base), StructuralHash.of(input.variant));
  }

  static 'structural-hash-metadata'(scenarioCase: ScenarioCaseOfType<HashScenarioCaseEntity.Type, 'structural-hash-metadata'>): void {
    const input = scenarioCase.input.json;
    assert.equal(StructuralHash.of(input.base), StructuralHash.of(input.metadataVariant));
  }

  static declaresRuntimeContainerHashing(): void {
    void it('hashes Date, Map, and Set values deterministically', () => {
      assert.equal(Hash.value(new Date(1)), Hash.value(new Date(1)));
      assert.equal(Hash.value(new Map([['a', 1], ['b', 2]])), Hash.value(new Map([['a', 1], ['b', 2]])));
      assert.equal(Hash.value(new Set(['a', 'b'])), Hash.value(new Set(['a', 'b'])));
      assert.notEqual(Hash.value(new Date(1)), Hash.value({}));
    });
  }
}

ScenarioSuite.register({
  'entity': HashScenarioCaseEntity,
  'extraTests': HashRunners.declaresRuntimeContainerHashing,
  'file': scenarioGroups,
  'name': 'Hash and StructuralHash',
  'runners': HashRunners
});
