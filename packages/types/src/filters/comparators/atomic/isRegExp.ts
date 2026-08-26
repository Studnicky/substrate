import { Guard } from '../../../guards/Guard.js';

export class IsRegExp {
  static isRegExp(value: unknown): value is RegExp   {
    const result = Guard.isRegExp(value);
    return result;
  }
}
