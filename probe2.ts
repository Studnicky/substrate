export function shallowCopy<T>(value: readonly T[]): T[];
export function shallowCopy<T extends object>(value: T): T;
export function shallowCopy(value: object): object {
  if (Array.isArray(value)) {
    return value.slice();
  }
  return { ...value };
}
