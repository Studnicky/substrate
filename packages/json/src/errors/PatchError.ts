/** Thrown when a patch operation cannot be applied. */
export class PatchError extends Error {
  public readonly op: string;
  public readonly path: string;

  public constructor(message: string, op: string, path: string) {
    super(message);
    this.name = 'PatchError';
    this.op = op;
    this.path = path;
  }
}
