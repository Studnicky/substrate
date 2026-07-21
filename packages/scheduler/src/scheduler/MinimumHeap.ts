import type { PendingTaskInterface } from '../interfaces/PendingTaskInterface.js';

export class MinimumHeap {
  readonly #heap: PendingTaskInterface[];

  protected constructor() { this.#heap = []; }

  /** Creates a new `MinimumHeap` instance. */
  static create(): MinimumHeap {
    return new this();
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
    if (last !== undefined) { this.#heap[0] = last; this.#siftDown(0); }
    return minimum;
  }

  public peekAtMs(): number | undefined {
    const [top] = this.#heap;
    return top !== undefined ? top.atMs : undefined;
  }

  #bubbleUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parentIndex = Math.floor((current - 1) / 2);
      const parent = this.#heap[parentIndex];
      const child = this.#heap[current];
      if (parent === undefined || child === undefined || parent.atMs <= child.atMs) { break; }
      const temporary = parent;
      this.#heap[parentIndex] = child;
      this.#heap[current] = temporary;
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
      const leftTask = this.#heap[left];
      const smallestTask = this.#heap[smallest];
      if (left < heapLength && leftTask !== undefined && smallestTask !== undefined && leftTask.atMs < smallestTask.atMs) { smallest = left; }
      const rightTask = this.#heap[right];
      const candidateTask = this.#heap[smallest];
      if (right < heapLength && rightTask !== undefined && candidateTask !== undefined && rightTask.atMs < candidateTask.atMs) { smallest = right; }
      if (smallest === current) { break; }
      const temporary = this.#heap[current];
      const swapTarget = this.#heap[smallest];
      if (temporary === undefined || swapTarget === undefined) { break; }
      this.#heap[current] = swapTarget;
      this.#heap[smallest] = temporary;
      current = smallest;
    }
  }
}
