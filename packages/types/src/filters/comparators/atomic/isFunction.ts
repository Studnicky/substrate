export class IsFunction {
  static isFunction(value: unknown): boolean   {
    const result = typeof value === 'function';
    return result;
  }
}
