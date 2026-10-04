import { Path } from '../../../src/index.js';

export class OpenPath extends Path {
  protected static override isSafeProperty(_name: string): boolean {
    return true;
  }
}
