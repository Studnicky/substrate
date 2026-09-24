/** JSON Pointer utilities and safe dot-path access for arbitrary values. */

import { Predicates } from '@studnicky/types/browser';

import type { JsonValueEntity } from '../entities/JsonValueEntity.js';
import type { PathGetOptionsEntity } from '../entities/PathGetOptionsEntity.js';
import type { PathWildcardResultInterface } from '../interfaces/PathWildcardResultInterface.js';

import { BRACKET_QUOTED_KEY_PATTERN, DANGEROUS_PROPERTIES, NUMERIC_SEGMENT_PATTERN, VALID_IDENTIFIER } from '../constants/PathConstants.js';

interface PathBracketQuotedResultInterface {
  readonly 'matched': boolean;
  readonly 'value': unknown;
}

interface PathArraySegmentResultInterface {
  readonly 'stop': boolean;
  readonly 'value': unknown;
}

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

    const bracketResult = this.getBracketQuoted(object, path);
    if (bracketResult.matched) {
      return bracketResult.value;
    }

    const parts = path.split('.');
    if (options?.maximumDepth !== undefined && parts.length > options.maximumDepth) {return undefined;}
    const result = this.getDotPath(object, parts);
    return result;
  }

  /** Handles a fully bracket-quoted-key path (e.g. `["a"]["b"]`). `matched: false` signals fallthrough to dot-path parsing. */
  protected static getBracketQuoted(object: JsonValueEntity.Type, path: string): PathBracketQuotedResultInterface {
    if (!(path.startsWith('[') && path.includes('"]'))) {
      return { 'matched': false, 'value': undefined };
    }
    const matches = [...path.matchAll(BRACKET_QUOTED_KEY_PATTERN)];
    if (matches.length === 0) {
      return { 'matched': false, 'value': undefined };
    }

    let current: unknown = object;
    const matchLength = matches.length;
    for (let index = 0; index < matchLength; index += 1) {
      const match = matches[index];
      if (match === undefined) {
        continue;
      }
      const key = match[0].slice(2, -2);
      if (!this.isSafeProperty(key) || !Predicates.isObjectLike(current)) {
        return { 'matched': true, 'value': undefined };
      }
      current = Reflect.get(current, key);
    }
    return { 'matched': true, 'value': current };
  }

  /** Walks dot-separated `parts`, dispatching each segment to `getSegment`. */
  protected static getDotPath(object: JsonValueEntity.Type, parts: string[]): unknown {
    let current: unknown = object;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part === undefined || part === '') {continue;}
      if (current === null || current === undefined) {return undefined;}

      const segmentResult = this.getSegment(current, part, parts, index);
      if (segmentResult.stop) {return segmentResult.value;}
      current = segmentResult.value;
    }
    return current;
  }

  /** Resolves one dot-path segment, dispatching a bracketed segment to `getArraySegment`. */
  protected static getSegment(current: unknown, part: string, parts: string[], index: number): PathArraySegmentResultInterface {
    if (part.includes('[') && part.includes(']')) {
      const result = this.getArraySegment(current, part, parts, index);
      return result;
    }
    if (!this.isSafeProperty(part) || !Predicates.isObjectLike(current)) {
      return { 'stop': true, 'value': undefined };
    }
    const value: unknown = Reflect.get(current, part);
    return { 'stop': false, 'value': value };
  }

  /** Resolves one `field[index]`/`field[*]` segment. `stop: true` means the caller should return `value` immediately. */
  protected static getArraySegment(current: unknown, part: string, parts: string[], index: number): PathArraySegmentResultInterface {
    const bracketIndex = part.indexOf('[');
    const fieldName = part.slice(0, bracketIndex);
    const arrayIndex = part.slice(bracketIndex + 1, -1);
    if (!this.isSafeProperty(fieldName) || !Predicates.isObjectLike(current)) {return { 'stop': true, 'value': undefined };}
    const arrayValue: unknown = Reflect.get(current, fieldName);
    if (!Array.isArray(arrayValue)) {return { 'stop': true, 'value': undefined };}
    if (arrayIndex === '*') {
      const wildcard = { 'array': arrayValue, 'isWildcard': true, 'remainingPath': parts.slice(index + 1) } satisfies PathWildcardResultInterface;
      return { 'stop': true, 'value': wildcard };
    }
    if (!NUMERIC_SEGMENT_PATTERN.test(arrayIndex)) {return { 'stop': true, 'value': undefined };}
    const arrayItem: unknown = arrayValue[Number(arrayIndex)];
    return { 'stop': false, 'value': arrayItem };
  }
}
