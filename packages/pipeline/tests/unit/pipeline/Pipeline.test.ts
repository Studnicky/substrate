import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Pipeline } from '../../../src/pipeline/Pipeline.js';

void describe('Pipeline', () => {
  void describe('construction', () => {
    void it('starts with no registered transforms (run returns input unchanged)', async () => {
      const pipeline = new Pipeline<string>();
      const result = await pipeline.run('hello');
      assert.strictEqual(result, 'hello');
    });

    void it('clear() on a new pipeline does not throw', () => {
      const pipeline = new Pipeline<number>();
      assert.doesNotThrow(() => pipeline.clear());
    });
  });

  void describe('add()', () => {
    void it('adds a transform function (run applies it)', async () => {
      const pipeline = new Pipeline<number>();
      pipeline.add((n) => n + 1);
      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);
    });

    void it('adds multiple transform functions (run applies all)', async () => {
      const pipeline = new Pipeline<number>();
      pipeline.add((n) => n + 1);
      pipeline.add((n) => n * 2);
      // (0 + 1) * 2 = 2
      const result = await pipeline.run(0);
      assert.strictEqual(result, 2);
    });

    void it('returns a remove function', () => {
      const pipeline = new Pipeline<number>();
      const remove = pipeline.add((n) => n + 1);
      assert.strictEqual(typeof remove, 'function');
    });

    void it('returned remove function removes only that transform', async () => {
      const pipeline = new Pipeline<number>();
      const fn1 = (n: number) => n + 100;
      const fn2 = (n: number) => n * 2;
      const remove1 = pipeline.add(fn1);
      pipeline.add(fn2);

      remove1();

      // Only fn2 (n * 2) should remain
      const result = await pipeline.run(5);
      assert.strictEqual(result, 10);
    });

    void it('calling remove twice is idempotent', async () => {
      const pipeline = new Pipeline<number>();
      const remove = pipeline.add((n) => n + 1);
      remove();
      assert.doesNotThrow(() => remove());
      // No transforms remain — input passes through
      const result = await pipeline.run(5);
      assert.strictEqual(result, 5);
    });
  });

  void describe('clear()', () => {
    void it('removes all transform functions', async () => {
      const pipeline = new Pipeline<string>();
      pipeline.add((s) => s + '!');
      pipeline.add((s) => s.toUpperCase());
      pipeline.clear();
      const result = await pipeline.run('hello');
      assert.strictEqual(result, 'hello');
    });

    void it('can be called on an empty pipeline', () => {
      const pipeline = new Pipeline<string>();
      assert.doesNotThrow(() => pipeline.clear());
    });

    void it('can be called multiple times', async () => {
      const pipeline = new Pipeline<string>();
      pipeline.add((s) => s);
      pipeline.clear();
      pipeline.clear();
      const result = await pipeline.run('test');
      assert.strictEqual(result, 'test');
    });
  });

  void describe('run()', () => {
    void it('returns the input unchanged when pipeline is empty', async () => {
      const pipeline = new Pipeline<number>();
      const result = await pipeline.run(42);
      assert.strictEqual(result, 42);
    });

    void it('applies a single synchronous transform', async () => {
      const pipeline = new Pipeline<number>();
      pipeline.add((n) => n + 10);
      const result = await pipeline.run(5);
      assert.strictEqual(result, 15);
    });

    void it('applies a single async transform', async () => {
      const pipeline = new Pipeline<string>();
      pipeline.add(async (s) => s + ' world');
      const result = await pipeline.run('hello');
      assert.strictEqual(result, 'hello world');
    });

    void it('chains multiple transforms in order', async () => {
      const pipeline = new Pipeline<number>();
      pipeline.add((n) => n + 1);
      pipeline.add((n) => n * 2);
      pipeline.add((n) => n - 3);
      // (5 + 1) * 2 - 3 = 9
      const result = await pipeline.run(5);
      assert.strictEqual(result, 9);
    });

    void it('chains async and sync transforms', async () => {
      const pipeline = new Pipeline<string>();
      pipeline.add(async (s) => s + ' async');
      pipeline.add((s) => s + ' sync');
      const result = await pipeline.run('start');
      assert.strictEqual(result, 'start async sync');
    });

    void it('passes object context through transforms', async () => {
      interface Ctx { count: number; label: string }
      const pipeline = new Pipeline<Ctx>();
      pipeline.add((ctx) => ({ ...ctx, count: ctx.count + 1 }));
      pipeline.add((ctx) => ({ ...ctx, label: ctx.label + '!' }));
      const result = await pipeline.run({ count: 0, label: 'test' });
      assert.strictEqual(result.count, 1);
      assert.strictEqual(result.label, 'test!');
    });

    void it('does not mutate the original input', async () => {
      const pipeline = new Pipeline<number[]>();
      pipeline.add((arr) => [...arr, 99]);
      const original = [1, 2, 3];
      const result = await pipeline.run(original);
      assert.deepStrictEqual(original, [1, 2, 3]);
      assert.deepStrictEqual(result, [1, 2, 3, 99]);
    });

    void it('run after add/remove reflects current fns only', async () => {
      const pipeline = new Pipeline<number>();
      const remove = pipeline.add((n) => n + 100);
      pipeline.add((n) => n * 2);
      remove();
      // Only n * 2 remains
      const result = await pipeline.run(5);
      assert.strictEqual(result, 10);
    });
  });
});
