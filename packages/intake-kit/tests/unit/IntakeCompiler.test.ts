import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IntakeCompiler } from '../../src/IntakeCompiler.js';

interface WidgetEntityInterface {
  readonly 'name': string;
}

class WidgetTestError extends Error {
  public readonly entityName: string;
  public readonly reason: string;

  public constructor(entityName: string, reason: string) {
    super(`${entityName}: ${reason}`);
    this.entityName = entityName;
    this.reason = reason;
  }
}

const CONFIG: IntakeCompiler.BoundaryConfigInterface = {
  'clone': (value) => structuredClone(value),
  'onInvalidCandidate': (entityName, reason) => { throw new WidgetTestError(entityName, reason); }
};

const parser: IntakeCompiler.ParserInterface<WidgetEntityInterface> = (candidate, options) => {
  const rawName = candidate.name;
  if (typeof rawName === 'string') {
    return { 'name': rawName };
  }
  if (options.coerce && typeof rawName === 'number') {
    return { 'name': String(rawName) };
  }
  return undefined;
};

void describe('IntakeCompiler.compile', () => {
  void it('intake coerces per the injected options', () => {
    const { intake } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    const result = intake({ 'name': 42 });
    assert.deepEqual(result, { 'name': '42' });
  });

  void it('create does not coerce', () => {
    const { create } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    assert.throws(() => create({ 'name': 42 } as unknown as Partial<WidgetEntityInterface>), WidgetTestError);
  });

  void it('create fills nothing and passes through valid trusted data', () => {
    const { create } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    const result = create({ 'name': 'gear' });
    assert.deepEqual(result, { 'name': 'gear' });
  });

  void it('intake rejects a non-object candidate through onInvalidCandidate', () => {
    const { intake } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    assert.throws(() => intake('not an object'), WidgetTestError);
    assert.throws(() => intake(null), WidgetTestError);
    assert.throws(() => intake(['array']), WidgetTestError);
  });

  void it('intake rejects when the parser returns undefined', () => {
    const { intake } = IntakeCompiler.compile(parser, 'WidgetEntity', CONFIG);
    assert.throws(() => intake({ 'name': true }), WidgetTestError);
  });

  void it('clones the input so the caller-held value is never mutated', () => {
    let observedCandidate: unknown;
    const observingParser: IntakeCompiler.ParserInterface<WidgetEntityInterface> = (candidate) => {
      observedCandidate = candidate;
      Reflect.set(candidate, 'name', 'mutated');
      return { 'name': String(candidate.name) };
    };
    const { intake } = IntakeCompiler.compile(observingParser, 'WidgetEntity', CONFIG);
    const original = { 'name': 'original' };
    intake(original);
    assert.equal(original.name, 'original');
    assert.notEqual(observedCandidate, original);
  });

  void it('compileCreate and compileIntake produce independently callable functions', () => {
    const create = IntakeCompiler.compileCreate(parser, 'WidgetEntity', CONFIG);
    const intake = IntakeCompiler.compileIntake(parser, 'WidgetEntity', CONFIG);
    assert.deepEqual(create({ 'name': 'gear' }), { 'name': 'gear' });
    assert.deepEqual(intake({ 'name': 42 }), { 'name': '42' });
  });
});
