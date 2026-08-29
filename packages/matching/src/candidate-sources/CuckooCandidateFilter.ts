export class CuckooCandidateFilter {
  readonly #buckets: (string | undefined)[][];
  readonly #bucketSize: number;
  readonly #relocationLimit: number;

  constructor(bucketCount: number, options: { readonly 'bucketSize'?: number; readonly 'relocationLimit'?: number } = {}) {
    const bucketSize = options.bucketSize ?? 4;
    const relocationLimit = options.relocationLimit ?? 500;
    if (!Number.isInteger(bucketCount) || bucketCount <= 0) {
      throw new RangeError('Bucket count must be a positive integer.');
    }
    if (!Number.isInteger(bucketSize) || bucketSize <= 0) {
      throw new RangeError('Bucket size must be a positive integer.');
    }
    const buckets = Array.from<(string | undefined)[]>({ 'length': bucketCount });
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
      buckets[bucketIndex] = Array.from<string | undefined>({ 'length': bucketSize });
    }
    this.#buckets = buckets;
    this.#bucketSize = bucketSize;
    this.#relocationLimit = relocationLimit;
  }

  add(value: string): boolean {
    const fingerprint = this.fingerprint(value);
    const first = this.index(value);
    const second = this.alternate(first, fingerprint);
    if (this.insert(first, fingerprint) || this.insert(second, fingerprint)) {
      return true;
    }
    let index = first;
    let displaced = fingerprint;
    const buckets: number[] = [];
    const slots: number[] = [];
    const values: (string | undefined)[] = [];
    for (let relocation = 0; relocation < this.#relocationLimit; relocation += 1) {
      const slot = relocation % this.#bucketSize;
      const bucket = this.#buckets[index];
      if (bucket === undefined) {
        this.restore(buckets, slots, values);
        return false;
      }
      const current = bucket[slot];
      buckets.push(index);
      slots.push(slot);
      values.push(current);
      bucket[slot] = displaced;
      if (current === undefined) {
        return true;
      }
      displaced = current;
      index = this.alternate(index, displaced);
      if (this.insert(index, displaced)) {
        return true;
      }
    }
    this.restore(buckets, slots, values);
    return false;
  }

  delete(value: string): boolean {
    const fingerprint = this.fingerprint(value);
    const result = this.remove(this.index(value), fingerprint) || this.remove(this.alternate(this.index(value), fingerprint), fingerprint);
    return result;
  }

  mightContain(value: string): boolean {
    const fingerprint = this.fingerprint(value);
    const result = this.contains(this.index(value), fingerprint) || this.contains(this.alternate(this.index(value), fingerprint), fingerprint);
    return result;
  }

  private alternate(index: number, fingerprint: string): number {
    const result = (index ^ this.hash(fingerprint)) % this.#buckets.length;
    return result;
  }

  private contains(index: number, fingerprint: string): boolean {
    const result = this.#buckets[index]?.includes(fingerprint) ?? false;
    return result;
  }

  private fingerprint(value: string): string {
    const result = this.hash(value).toString(36);
    return result;
  }

  private hash(value: string): number {
    let hash = 5_381;
    for (const character of value) {
      hash = ((hash * 33) ^ character.codePointAt(0)!) >>> 0;
    }
    return hash;
  }

  private index(value: string): number {
    const result = this.hash(value) % this.#buckets.length;
    return result;
  }

  private insert(index: number, fingerprint: string): boolean {
    const bucket = this.#buckets[index];
    if (bucket === undefined) {
      return false;
    }
    const empty = bucket.indexOf(undefined);
    if (empty === -1) {
      return false;
    }
    bucket[empty] = fingerprint;
    const result = true;
    return result;
  }

  private remove(index: number, fingerprint: string): boolean {
    const bucket = this.#buckets[index];
    const slot = bucket?.indexOf(fingerprint) ?? -1;
    if (slot === -1 || bucket === undefined) {
      return false;
    }
    bucket[slot] = undefined;
    return true;
  }

  private restore(buckets: readonly number[], slots: readonly number[], values: readonly (string | undefined)[]): void {
    for (let index = buckets.length - 1; index >= 0; index -= 1) {
      const bucketIndex = buckets[index];
      const slot = slots[index];
      const value = values[index];
      if (bucketIndex === undefined || slot === undefined) {
        continue;
      }
      const bucket = this.#buckets[bucketIndex];
      if (bucket !== undefined) {
        bucket[slot] = value;
      }
    }
  }
}
