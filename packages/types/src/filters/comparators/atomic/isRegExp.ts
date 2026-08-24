import { Guard } from '../../../guards/Guard.js';

export class IsRegExp {
  static isRegExp(value: unknown): boolean   {
    const result = Guard.isRegExp(value);
    return result;
  }
}
