export class FileLockTimeoutError extends Error {
  readonly path: string;
  readonly timeoutMs: number;

  constructor(path: string, timeoutMs: number) {
    super(`Timed out acquiring lock on "${path}" after ${String(timeoutMs)}ms`);
    this.name = 'FileLockTimeoutError';
    this.path = path;
    this.timeoutMs = timeoutMs;
  }
}
