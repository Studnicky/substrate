/** JSON Pointer utilities and safe dot-path access for arbitrary values. */

import { Guard } from '@studnicky/types';

import type { JsonValueEntity } from '../entities/JsonValueEntity.js';
import type { PathGetOptionsEntity } from '../entities/PathGetOptionsEntity.js';
import type { PathWildcardResultInterface } from '../interfaces/PathWildcardResultInterface.js';

import { BRACKET_QUOTED_KEY_PATTERN, DANGEROUS_PROPERTIES, NUMERIC_SEGMENT_PATTERN, VALID_IDENTIFIER } from '../constants/PathConstants.js';

export class Path {
  /** Return whether `name` is safe to use as a property access key. */
  protected static isSafeProperty(name: string): boolean {
    const result = !DANGEROUS_PROPERTIES.has(name) && !name.startsWith('__') && !name.includes('../') && !name.includes('..\\') && !name.includes(' ');
    return result;
  }

  /** Convert a JSON Pointer to JavaScript access notation. */
  public static toAccess(jsonPointer: string): string {
    if (jsonPointer === '' || jsonPointer === '/') {return '';}
    let result = '';
    const rawSegments = jsonPointer.split('/');
    const rawSegmentLength = rawSegments.length;
    for (let index = 1; index < rawSegmentLength; index += 1) {
      const rawSegment = rawSegments[index];
      if (rawSegment === undefined) {
        continue;
      }
      const segment = rawSegment.replaceAll('~1', '/').replaceAll('~0', '~');
      if (NUMERIC_SEGMENT_PATTERN.test(segment)) {result += `[${segment}]`;}
      else if (VALID_IDENTIFIER.test(segment)) {result += result === '' ? segment : `.${segment}`;}
      else {result += `["${segment}"]`;}
    }
    return result;
  }

  /** Extract a value from `object` using a proto-safe dot-path expression. */
  public static get(object: JsonValueEntity.Type, path: string, options?: PathGetOptionsEntity.Type): unknown {
    if (path === '') {return object;}
    if (path.startsWith('[') && path.includes('"]')) {
      const matches = [...path.matchAll(BRACKET_QUOTED_KEY_PATTERN)];
      if (matches.length > 0) {
        let current: unknown = object;
        const matchLength = matches.length;
        for (let index = 0; index < matchLength; index += 1) {
          const match = matches[index];
          if (match === undefined) {
            continue;
          }
          const key = match[0].slice(2, -2);
          if (!this.isSafeProperty(key) || !Guard.isObjectLike(current)) {return undefined;}
          current = Reflect.get(current, key);
        }
        return current;
      }
    }

    const parts = path.split('.');
    if (options?.maximumDepth !== undefined && parts.length > options.maximumDepth) {return undefined;}
    let current: unknown = object;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part === undefined || part === '') {continue;}
      if (current === null || current === undefined) {return undefined;}
      if (part.includes('[') && part.includes(']')) {
        const bracketIndex = part.indexOf('[');
        const fieldName = part.slice(0, bracketIndex);
        const arrayIndex = part.slice(bracketIndex + 1, -1);
        if (!this.isSafeProperty(fieldName) || !Guard.isObjectLike(current)) {return undefined;}
        const arrayValue: unknown = Reflect.get(current, fieldName);
        if (!Array.isArray(arrayValue)) {return undefined;}
        if (arrayIndex === '*') {
          return { 'array': arrayValue, 'isWildcard': true, 'remainingPath': parts.slice(index + 1) } satisfies PathWildcardResultInterface;
        }
        if (!NUMERIC_SEGMENT_PATTERN.test(arrayIndex)) {return undefined;}
        current = arrayValue[Number(arrayIndex)];
        continue;
      }
      if (!this.isSafeProperty(part) || !Guard.isObjectLike(current)) {return undefined;}
      current = Reflect.get(current, part);
    }
    return current;
  }
}
