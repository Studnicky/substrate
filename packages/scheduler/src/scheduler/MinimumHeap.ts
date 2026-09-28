import type { PendingTaskInterface } from '../interfaces/PendingTaskInterface.js';

export class MinimumHeap {
  readonly #heap: PendingTaskInterface[];

  protected constructor() { this.#heap = []; }

  /** Creates a new `MinimumHeap` instance. */
  static create(): MinimumHeap {
    return new MinimumHeap();
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
      const smallest = this.#findSmallestChildIndex(current, heapLength);
      if (smallest === current) { break; }
      if (!this.#swapEntries(current, smallest)) { break; }
      current = smallest;
    }
  }

  /** Index of the smallest of `current` and its two children, by `atMs`, within `[0, heapLength)`. */
  #findSmallestChildIndex(current: number, heapLength: number): number {
    const left = current * 2 + 1;
    const right = current * 2 + 2;
    let smallest = current;
    const leftTask = this.#heap.at(left);
    const smallestTask = this.#heap.at(smallest);
    if (left < heapLength && leftTask !== undefined && smallestTask !== undefined && leftTask.atMs < smallestTask.atMs) { smallest = left; }
    const rightTask = this.#heap.at(right);
    const candidateTask = this.#heap.at(smallest);
    if (right < heapLength && rightTask !== undefined && candidateTask !== undefined && rightTask.atMs < candidateTask.atMs) { smallest = right; }
    return smallest;
  }

  /** Swaps the two heap slots; returns false (no-op) if either slot is empty. */
  #swapEntries(current: number, smallest: number): boolean {
    const temporary = this.#heap.at(current);
    const swapTarget = this.#heap.at(smallest);
    if (temporary === undefined || swapTarget === undefined) { return false; }
    this.#heap.fill(swapTarget, current, current + 1);
    this.#heap.fill(temporary, smallest, smallest + 1);
    return true;
  }
}
