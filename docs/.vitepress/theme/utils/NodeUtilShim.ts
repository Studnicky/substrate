// Browser shim for node:util. Packages import `isDeepStrictEqual` by name; the playground
// assertion shim shares the same structural comparison.

function enumerableKeys(value: object): (string | symbol)[] {
  return Reflect.ownKeys(value).filter((key) => { return Object.prototype.propertyIsEnumerable.call(value, key); });
}

function equalProperties(a: object, b: object): boolean {
  const aKeys = enumerableKeys(a);
  return aKeys.length === enumerableKeys(b).length && aKeys.every((key) => {
    return Object.prototype.propertyIsEnumerable.call(b, key)
      && isDeepStrictEqual(Reflect.get(a, key), Reflect.get(b, key));
  });
}

function equalCollections(a: object, b: object): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Map && b instanceof Map) {
    return a.size === b.size && [...a].every(([key, value]) => { return b.has(key) && isDeepStrictEqual(value, b.get(key)); });
  }
  if (a instanceof Set && b instanceof Set) {
    return a.size === b.size && [...a].every((value) => { return b.has(value); });
  }
  return equalProperties(a, b);
}

export function isDeepStrictEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    return Object.getPrototypeOf(a) === Object.getPrototypeOf(b) && equalCollections(a, b);
  }
  return false;
}
