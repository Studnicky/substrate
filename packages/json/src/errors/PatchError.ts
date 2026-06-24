import { JsonError } from './JsonError.js';

/** Thrown when a patch operation cannot be applied. */
export class PatchError extends JsonError {
  public readonly op: string;
  public readonly path: string;

  public constructor(message: string, op: string, path: string) {
    super({ 'code': 'json.patchFailed', 'message': message, 'retryable': false });
    this.op = op;
    this.path = path;
  }
}
