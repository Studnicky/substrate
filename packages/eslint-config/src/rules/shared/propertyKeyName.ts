import { ObjectGuard } from './ObjectGuard.js';

export class PropertyKeyName {
  // Handles both unquoted (`key:`) and quoted (`'key':`) property keys — this
  // repo's `quote-props: always` convention makes every real property key a
  // string Literal, not an Identifier, so both forms must resolve the same name.
  public static get(property: unknown): string | undefined {
    if (!ObjectGuard.isObject(property)) { return undefined; }
    const key: unknown = property.key;
    if (!ObjectGuard.isObject(key)) { return undefined; }

    if (key.type === 'Identifier') {
      return typeof key.name === 'string' ? key.name : undefined;
    }

    if (key.type === 'Literal') {
      return typeof key.value === 'string' ? key.value : undefined;
    }

    return undefined;
  }
}
