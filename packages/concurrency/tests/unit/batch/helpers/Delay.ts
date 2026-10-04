/**
 * Delay — resolves a Promise after a given number of milliseconds.
 */
export class Delay {
  static ms(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }
}
