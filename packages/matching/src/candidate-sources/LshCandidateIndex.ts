import { RuntimeError } from '@studnicky/errors';

export class LshCandidateIndex {
  readonly #idsByBand = new Map<string, Set<string>>();
  readonly #bandsById = new Map<string, readonly string[]>();
  readonly #rowsPerBand: number;

  constructor(rowsPerBand: number) {
    if (!Number.isInteger(rowsPerBand) || rowsPerBand <= 0) {
      throw RuntimeError.create('Rows per band must be a positive integer.');
    }
    this.#rowsPerBand = rowsPerBand;
  }

  register(id: string, signature: readonly number[]): void {
    this.unregister(id);
    const bands = this.createBands(signature);
    this.#bandsById.set(id, bands);
    for (let index = 0; index < bands.length; index += 1) {
      const band = bands[index];
      if (band === undefined) {
        continue;
      }
      const ids = this.#idsByBand.get(band) ?? new Set<string>();
      ids.add(id);
      this.#idsByBand.set(band, ids);
    }
  }

  unregister(id: string): boolean {
    const bands = this.#bandsById.get(id);
    if (bands === undefined) { return false; }
    for (let index = 0; index < bands.length; index += 1) {
      const band = bands[index];
      if (band === undefined) {
        continue;
      }
      const ids = this.#idsByBand.get(band);
      if (ids !== undefined) {
        ids.delete(id);
        if (ids.size === 0) { this.#idsByBand.delete(band); }
      }
    }
    this.#bandsById.delete(id);
    return true;
  }

  candidates(signature: readonly number[]): readonly string[] {
    const result = new Set<string>();
    const bands = this.createBands(signature);
    for (let bandIndex = 0; bandIndex < bands.length; bandIndex += 1) {
      const band = bands[bandIndex];
      if (band === undefined) {
        continue;
      }
      for (const id of this.#idsByBand.get(band) ?? []) { result.add(id); }
    }
    return [...result];
  }

  private createBands(signature: readonly number[]): readonly string[] {
    const result: string[] = [];
    for (let start = 0; start < signature.length; start += this.#rowsPerBand) {
      result.push(signature.slice(start, start + this.#rowsPerBand).join(':'));
    }
    return result;
  }
}
