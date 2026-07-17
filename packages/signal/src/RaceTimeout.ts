/** Races a timer against an optional AbortSignal, tearing down whichever side loses. */
export class RaceTimeout {
  static async wait(ms: number, signal: AbortSignal | undefined): Promise<'timeout' | 'aborted'> {
    if (signal?.aborted === true) {
      return 'aborted';
    }

    return await new Promise<'timeout' | 'aborted'>((resolve) => {
      const onAbort = (): void => {
        clearTimeout(timer);
        resolve('aborted');
      };

      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve('timeout');
      }, ms);

      signal?.addEventListener('abort', onAbort);
    });
  }
}
