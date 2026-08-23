/**
 * Path — JSON Pointer utilities and dot-path access.
 *
 * - `toAccess`: JSON Pointer → JS access notation.
 * - `get`: proto-pollution-safe dot-path read with `[*]` wildcard support and maximumDepth.
 *
 * Subclass `Path` and override `protected static isSafeProperty` to customise the
 * property deny-list.
 */

import type { JsonObjectEntity } from '../entities/JsonObjectEntity.js';
import type { PathGetOptionsEntity } from '../entities/PathGetOptionsEntity.js';
import type { PathWildcardResultInterface } from '../interfaces/PathWildcardResultInterface.js';

import { BRACKET_QUOTED_KEY_PATTERN, DANGEROUS_PROPERTIES, NUMERIC_SEGMENT_PATTERN, VALID_IDENTIFIER } from '../constants/PathConstants.js';
import { JsonValueEntity } from '../entities/JsonValueEntity.js';

export class Path {
  // ---------------------------------------------------------------------------
  // Protected steps — override in subclasses to customise safety policy
  // ---------------------------------------------------------------------------

  /**
   * Return `true` when `name` is safe to use as a property access key.
   *
   * Override this method to extend or restrict the deny-list. The base
   * implementation blocks `DANGEROUS_PROPERTIES`, double-underscore prefixes,
   * path-traversal sequences, and embedded spaces.
   */
  protected static isSafeProperty(name: string): boolean {
    if (DANGEROUS_PROPERTIES.has(name)) {
      return false;
    }
    // Block any double-underscore prefix
    if (name.startsWith('__')) {
      return false;
    }
    // Block traversal attempts
    if (name.includes('../') || name.includes('..\\')) {
      return false;
    }
    // Block spaces
    if (name.includes(' ')) {
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Public static API
  // ---------------------------------------------------------------------------

  /**
   * Convert a JSON Pointer (`/items/0/quantity`) to JS access form
   * (`items[0].quantity`). Root pointer (`""` or `"/"`) returns `""`.
   */
  public static toAccess(jsonPointer: string): string {
    if (jsonPointer === '' || jsonPointer === '/') {
      return '';
    }

    const segments = jsonPointer
      .split('/')
      .slice(1)
      .map((seg) => { const result = seg.replaceAll('~1', '/').replaceAll('~0', '~'); return result; });

    let result = '';

    const length = segments.length;
    for (let index = 0; index < length; index += 1) {
      const segment = segments[index];
      if (segment === undefined) {
        continue;
      }

      if (NUMERIC_SEGMENT_PATTERN.test(segment)) {
        result += `[${segment}]`;
      } else if (VALID_IDENTIFIER.test(segment)) {
        result += result === '' ? segment : `.${segment}`;
      } else {
        result += `["${segment}"]`;
      }
    }

    return result;
  }

  /**
   * Extract a value from `object` using a dot-path string.
   *
   * Supports array indexing (`items[0]`) and wildcard (`items[*]`).
   * Proto-pollution safe — returns `undefined` for dangerous property names.
   *
   * When `[*]` is encountered, returns a `PathWildcardResultInterface` sentinel
   * describing the matched array and any remaining path suffix.
   *
   * @param object - The parsed JSON object to traverse.
   * @param path - Dot-separated path (e.g. `"user.address.city"`).
   * @param options - Optional `maximumDepth` to limit traversal depth.
   */
  public static get(
    object: JsonObjectEntity.Type,
    path: string,
    options?: PathGetOptionsEntity.Type
  ): JsonValueEntity.Type | PathWildcardResultInterface | undefined {
    if (path === '') {
      return object;
    }

    // Bracket-quoted key syntax: ["special.key"]
    if (path.startsWith('[') && path.includes('"]')) {
      const matches = [...path.matchAll(BRACKET_QUOTED_KEY_PATTERN)];

      if (matches.length > 0) {
        let current: JsonValueEntity.Type = object;

        const length = matches.length;
        for (let index = 0; index < length; index += 1) {
          const match = matches[index];
          if (match === undefined) {
            continue;
          }
          const key = match[0].slice(2, -2);

          if (!this.isSafeProperty(key)) {
            return undefined;
          }

          if (current === null || typeof current !== 'object') {
            return undefined;
          }
          const rawValue: unknown = Reflect.get(current, key);
          if (!JsonValueEntity.validate(rawValue)) {
            return undefined;
          }
          current = rawValue;
        }

        return current;
      }
    }

    const parts = path.split('.');

    if (options?.maximumDepth !== undefined && parts.length > options.maximumDepth) {
      return undefined;
    }

    let current: JsonValueEntity.Type = object;
    const length = parts.length;

    for (let index = 0; index < length; index += 1) {
      const part = parts[index];

      if (part === undefined || part === '') {
        continue;
      }

      if (current === null || current === undefined) {
        return undefined;
      }

      if (part.includes('[') && part.includes(']')) {
        const bracketIndex = part.indexOf('[');
        const fieldName = part.slice(0, bracketIndex);
        const arrayIndex = part.slice(bracketIndex + 1, -1);

        if (!this.isSafeProperty(fieldName)) {
          return undefined;
        }

        if (typeof current !== 'object') {
          return undefined;
        }

        const rawArrayValue: unknown = Reflect.get(current, fieldName);
        if (!JsonValueEntity.validate(rawArrayValue)) {
          return undefined;
        }
        const arrayValue = rawArrayValue;

        if (!Array.isArray(arrayValue)) {
          return undefined;
        }

        if (arrayIndex === '*') {
          const remaining = parts.slice(index + 1);

          return {
            'array': arrayValue,
            'isWildcard': true,
            'remainingPath': remaining
          } satisfies PathWildcardResultInterface;
        }

        if (!NUMERIC_SEGMENT_PATTERN.test(arrayIndex)) {
          return undefined;
        }

        const arrayIndexNumber = Number(arrayIndex);

        const rawIndexedValue: unknown = Reflect.get(arrayValue, arrayIndexNumber);
        if (!JsonValueEntity.validate(rawIndexedValue)) {
          return undefined;
        }
        current = rawIndexedValue;
      } else {
        if (!this.isSafeProperty(part)) {
          return undefined;
        }
        if (typeof current !== 'object') {
          return undefined;
        }

        const rawValue: unknown = Reflect.get(current, part);
        if (!JsonValueEntity.validate(rawValue)) {
          return undefined;
        }
        current = rawValue;
      }
    }

    return current;
  }
}
