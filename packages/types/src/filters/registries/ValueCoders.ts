/**
 * Registry of value coders for runtime types FilterValueEntity.Type excludes from its
 * static union (Date/Set/Map). Mirrors the Registry<T> pattern used for
 * gates/operators/arrayLogic in Plugins.ts.
 */

import type { ValueCoderInterface } from './ValueCoderInterface.js';

import { Registry } from './Registry.js';

const CORE = {
  'date': {
    'guard': (value: unknown): boolean => {
      const result = value instanceof Date;

      return result;
    }
  },
  'map': {
    'guard': (value: unknown): boolean => {
      const result = value instanceof Map;

      return result;
    }
  },
  'set': {
    'guard': (value: unknown): boolean => {
      const result = value instanceof Set;

      return result;
    }
  }
};

export class ValueCoders {
  public readonly coders: Registry<ValueCoderInterface> = new Registry('valueCoder', { 'CORE': CORE });
}
