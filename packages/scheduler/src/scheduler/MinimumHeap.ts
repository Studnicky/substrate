import { RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { PendingTaskInterface } from '../interfaces/PendingTaskInterface.js';

interface MinimumHeapSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class MinimumHeapInstance {
  static belongsTo<TInstance extends object>(constructor: MinimumHeapSubclassInterface<TInstance>, value: object): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class MinimumHeap {
  readonly #heap: PendingTaskInterface[];

  protected constructor() { this.#heap = []; }

  /** Creates a new `MinimumHeap` instance. */
  static create<TInstance extends MinimumHeap = MinimumHeap>(
    this: MinimumHeapSubclassInterface<TInstance>
  ): TInstance {
    const result: unknown = Reflect.construct(this, []);
    if (!Predicates.isObjectLike(result) || !MinimumHeapInstance.belongsTo(this, result)) {
      throw RuntimeError.create('MinimumHeap.create() did not construct the requested subclass.');
    }
    return result;
  }

  public insert(task: Readonly<PendingTaskInterface>): void {
    const retainedTask: PendingTaskInterface = {
      'atMs': task.atMs,
      'fire': task.fire,
      'id': task.id,
      'intervalMs': task.intervalMs,
      'variant': task.variant
    };
    this.#heap.push(retainedTask);
    this.#bubbleUp(this.#heap.length - 1);
  }

  public removeMinimum(): PendingTaskInterface | undefined {
    const heapLength = this.#heap.length;
    if (heapLength === 0) { return undefined; }
    const [minimum] = this.#heap;
    if (heapLength === 1) { this.#heap.pop(); return minimum; }
    const last = this.#heap.pop();
    if (last !== undefined) { this.#heap.fill(last, 0, 1); this.#siftDown(0); }
    return minimum;
  }

  public peekAtMs(): number | undefined {
    const [top] = this.#heap;
    const result = top !== undefined ? top.atMs : undefined;
    return result;
  }

  #bubbleUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parentIndex = Math.floor((current - 1) / 2);
      const parent = this.#heap.at(parentIndex);
      const child = this.#heap.at(current);
      if (parent === undefined || child === undefined || parent.atMs <= child.atMs) { break; }
      const temporary = parent;
      this.#heap.fill(child, parentIndex, parentIndex + 1);
      this.#heap.fill(temporary, current, current + 1);
      current = parentIndex;
    }
  }

  #siftDown(index: number): void {
    const heapLength = this.#heap.length;
    let current = index;
    for (;;) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let smallest = current;
      const leftTask = this.#heap.at(left);
      const smallestTask = this.#heap.at(smallest);
      if (left < heapLength && leftTask !== undefined && smallestTask !== undefined && leftTask.atMs < smallestTask.atMs) { smallest = left; }
      const rightTask = this.#heap.at(right);
      const candidateTask = this.#heap.at(smallest);
      if (right < heapLength && rightTask !== undefined && candidateTask !== undefined && rightTask.atMs < candidateTask.atMs) { smallest = right; }
      if (smallest === current) { break; }
      const temporary = this.#heap.at(current);
      const swapTarget = this.#heap.at(smallest);
      if (temporary === undefined || swapTarget === undefined) { break; }
      this.#heap.fill(swapTarget, current, current + 1);
      this.#heap.fill(temporary, smallest, smallest + 1);
      current = smallest;
    }
  }
}
