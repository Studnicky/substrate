/** Deep cloning for JavaScript values. */

export class Clone {
  /** Clone an array element-by-element. */
  protected static cloneArray(value: (PropertyKey | bigint | boolean | object | null | undefined)[]): (PropertyKey | bigint | boolean | object | null | undefined)[] {
    const result: (PropertyKey | bigint | boolean | object | null | undefined)[] = [];
    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      const item = value[index];
      result.push(this.deep(item));
    }
    return result;
  }

  /** Clone a Map, deep-cloning both keys and values. */
  protected static cloneMap(value: Map<PropertyKey | bigint | boolean | object | null | undefined, PropertyKey | bigint | boolean | object | null | undefined>): Map<PropertyKey | bigint | boolean | object | null | undefined, PropertyKey | bigint | boolean | object | null | undefined> {
    const cloned = new Map<PropertyKey | bigint | boolean | object | null | undefined, PropertyKey | bigint | boolean | object | null | undefined>();

    for (const [key, item] of value.entries()) {
      cloned.set(this.deep(key), this.deep(item));
    }

    return cloned;
  }

  /** Clone a Set, deep-cloning each member. */
  protected static cloneSet(value: Set<PropertyKey | bigint | boolean | object | null | undefined>): Set<PropertyKey | bigint | boolean | object | null | undefined> {
    const cloned = new Set<PropertyKey | bigint | boolean | object | null | undefined>();

    for (const item of value.values()) {
      cloned.add(this.deep(item));
    }

    return cloned;
  }

  /** Clone a Date by timestamp. */
  protected static cloneDate(value: Date): Date {
    const result = new Date(value.getTime());
    return result;
  }

  /** Clone an object's own enumerable keys. */
  protected static cloneObject(value: Record<string, PropertyKey | bigint | boolean | object | null | undefined>): Record<string, PropertyKey | bigint | boolean | object | null | undefined> {
    const cloned: Record<string, PropertyKey | bigint | boolean | object | null | undefined> = {};

    const entries = Object.entries(value);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [key, item] = entry;
      Reflect.set(cloned, key, this.deep(item));
    }

    return cloned;
  }

  /** Recursively deep-clone a value. */
  public static deep<T>(value: T): T;
  public static deep(value: PropertyKey | bigint | boolean | object | null | undefined): PropertyKey | bigint | boolean | object | null | undefined {
    const result = this.clone(value);
    return result;
  }

  /** Implement `deep` across the full JavaScript value domain. */
  protected static clone(value: PropertyKey | bigint | boolean | object | null | undefined): PropertyKey | bigint | boolean | object | null | undefined {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      const result = this.cloneArray(value);
      return result;
    }

    if (value instanceof Map) {
      const result = this.cloneMap(value);
      return result;
    }

    if (value instanceof Set) {
      const result = this.cloneSet(value);
      return result;
    }

    if (value instanceof Date) {
      const result = this.cloneDate(value);
      return result;
    }

    if (this.isRecord(value)) {
      const result = this.cloneObject(value);
      return result;
    }

    return value;
  }

  /** Shallow clone an object. */
  public static shallow<T extends object>(value: T): T {
    const result = { ...value };
    return result;
  }

  /** Identify the remaining object values whose own enumerable keys are cloned. */
  protected static isRecord(value: object): value is Record<string, PropertyKey | bigint | boolean | object | null | undefined> {
    const valueType = typeof value;
    const result = valueType === 'object';
    return result;
  }
}
