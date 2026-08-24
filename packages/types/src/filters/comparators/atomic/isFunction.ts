import { Guard } from '../../../guards/Guard.js';

export class IsFunction {
  static isFunction(value: unknown): boolean   {
    const result = Guard.isFunction(value);
    return result;
  }
}
