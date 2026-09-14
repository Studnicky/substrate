import { Predicates } from '@studnicky/types/node';

import { FilterValueEntity } from './FilterValueEntity.js';
import type {
  FilterRuntimeArrayInterface,
  FilterRuntimeDateInterface,
  FilterRuntimeMapInterface,
  FilterRuntimeRecordInterface,
  FilterRuntimeSetInterface
} from './interfaces.js';

import { FilterConfigurationError } from './errors/FilterConfigurationError.js';
import { ValueCoders } from './registries/ValueCoders.js';

const valueCoders = new ValueCoders();

namespace FilterValueGuardEntity {
  class Intake {
    public static intake(input: unknown):
      | FilterRuntimeArrayInterface
      | FilterRuntimeDateInterface
      | FilterRuntimeMapInterface
      | FilterRuntimeRecordInterface
      | FilterRuntimeSetInterface
      | FilterValueEntity.Type
      | undefined {
      if (input === undefined) {
        return input;
      }
      if (valueCoders.coders.get('CORE.date')?.guard(input) === true && input instanceof Date) {
        return input;
      }
      if (Predicates.isArray(input)) {
        const result = Intake.intakeArray(input);

        return result;
      }
      if (valueCoders.coders.get('CORE.set')?.guard(input) === true && input instanceof Set) {
        const result = Intake.intakeSet(input);

        return result;
      }
      if (valueCoders.coders.get('CORE.map')?.guard(input) === true && input instanceof Map) {
        const result = Intake.intakeMap(input);

        return result;
      }
      if (Predicates.isRecord(input)) {
        const result = Intake.intakeRecord(input);

        return result;
      }

      try {
        const result = FilterValueEntity.intake(input);

        return result;
      } catch (error) {
        if (error instanceof FilterConfigurationError) {
          throw error;
        }

        throw new FilterConfigurationError(`Not a valid filter runtime operand: ${typeof input}`, {});
      }
    }

    private static intakeArray(input: readonly unknown[]): FilterRuntimeArrayInterface {
      const result: Array<
        | FilterRuntimeArrayInterface
        | FilterRuntimeDateInterface
        | FilterRuntimeMapInterface
        | FilterRuntimeRecordInterface
        | FilterRuntimeSetInterface
        | FilterValueEntity.Type
        | undefined
      > = [];
      const inputLength = input.length;

      for (let index = 0; index < inputLength; index += 1) {
        result.push(Intake.intake(input[index]));
      }

      return result;
    }

    private static intakeMap(input: ReadonlyMap<unknown, unknown>): FilterRuntimeMapInterface {
      const result = new Map<string,
        | FilterRuntimeArrayInterface
        | FilterRuntimeDateInterface
        | FilterRuntimeMapInterface
        | FilterRuntimeRecordInterface
        | FilterRuntimeSetInterface
        | FilterValueEntity.Type
        | undefined
      >();

      for (const [key, item] of input.entries()) {
        result.set(String(key), Intake.intake(item));
      }

      return result;
    }

    private static intakeRecord(input: Record<string, unknown>): FilterRuntimeRecordInterface {
      const result: Record<string,
        | FilterRuntimeArrayInterface
        | FilterRuntimeDateInterface
        | FilterRuntimeMapInterface
        | FilterRuntimeRecordInterface
        | FilterRuntimeSetInterface
        | FilterValueEntity.Type
        | undefined
      > = {};
      const keys = Object.keys(input);
      const keysLength = keys.length;

      for (let index = 0; index < keysLength; index += 1) {
        const key = keys[index];

        if (key === undefined) {
          continue;
        }
        Object.defineProperty(result, key, {
          'configurable': true,
          'enumerable': true,
          'value': Intake.intake(input[key]),
          'writable': true
        });
      }

      return result;
    }

    private static intakeSet(input: ReadonlySet<unknown>): FilterRuntimeSetInterface {
      const result = new Set<
        | FilterRuntimeArrayInterface
        | FilterRuntimeDateInterface
        | FilterRuntimeMapInterface
        | FilterRuntimeRecordInterface
        | FilterRuntimeSetInterface
        | FilterValueEntity.Type
        | undefined
      >();

      for (const item of input) {
        result.add(Intake.intake(item));
      }

      return result;
    }
  }

  export const intake = Intake.intake;
}

export import FilterValueGuard = FilterValueGuardEntity;
