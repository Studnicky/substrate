import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BaseError } from '../../src/errors/BaseError.js';
import { CallerFault } from '../../src/errors/CallerFault.js';
import scenarioGroups from './caller-fault.scenarios.json' with { 'type': 'json' };
import { CallerFaultScenarioCaseEntity } from './entities/CallerFaultScenarioCaseEntity.js';

class CallerFaultFixtureError extends BaseError {
  public override readonly name: string = 'CallerFaultFixtureError';

  public constructor(message: string) {
    super({
      'code': 'types.testCallerFaultFixture',
      'message': message,
      'retryable': false
    });
  }
}

interface ValueFactoryInterface {
  (): unknown;
}

/** Caller-supplied failure values; the native error instances come from genuine platform failures. */
class CallerFaultValues {
  static readonly factories: ReadonlyMap<string, ValueFactoryInterface> = new Map<string, ValueFactoryInterface>([
    ['error', CallerFaultValues.platformError],
    ['null', CallerFaultValues.nullValue],
    ['object', CallerFaultValues.plainObject],
    ['string', CallerFaultValues.stringValue],
    ['type-error', CallerFaultValues.platformTypeError],
    ['undefined', CallerFaultValues.undefinedValue]
  ]);

  static create(valueKind: string): unknown {
    const factory = CallerFaultValues.factories.get(valueKind);
    assert.ok(factory !== undefined, `unknown value kind ${valueKind}`);
    const value = factory();
    return value;
  }

  static nullValue(): unknown {
    return null;
  }

  static plainObject(): unknown {
    return { 'caller': true };
  }

  static platformError(): unknown {
    try {
      readFileSync('/caller-fault-fixture/missing-file');
    } catch (caught: unknown) {
      return caught;
    }
    throw new CallerFaultFixtureError('Reading a missing file did not fail');
  }

  static platformTypeError(): unknown {
    try {
      JSON.stringify(1n);
    } catch (caught: unknown) {
      return caught;
    }
    throw new CallerFaultFixtureError('Serializing a bigint did not fail');
  }

  static stringValue(): unknown {
    return 'caller';
  }

  static undefinedValue(): void {}
}

class CallerFaultRunners {
  static 'propagate-rethrows'(scenarioCase: ScenarioCaseOfType<CallerFaultScenarioCaseEntity.Type, 'propagate-rethrows'>): void {
    const value = CallerFaultValues.create(scenarioCase.input.valueKind);

    assert.equal(CallerFaultRunners.thrownBy(value), value);
  }

  static async 'rejection-rejects'(scenarioCase: ScenarioCaseOfType<CallerFaultScenarioCaseEntity.Type, 'rejection-rejects'>): Promise<void> {
    const value = CallerFaultValues.create(scenarioCase.input.valueKind);

    assert.equal(await CallerFaultRunners.rejectedWith(value), value);
  }

  private static async rejectedWith(value: unknown): Promise<unknown> {
    try {
      await CallerFault.rejection(value);
    } catch (caught: unknown) {
      return caught;
    }

    const unexpected = Symbol('rejection resolved');
    return unexpected;
  }

  private static thrownBy(value: unknown): unknown {
    try {
      CallerFault.propagate(value);
    } catch (caught: unknown) {
      return caught;
    }

    const unexpected = Symbol('propagate returned');
    return unexpected;
  }
}

ScenarioSuite.register({
  'entity': CallerFaultScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'CallerFault',
  'runners': CallerFaultRunners
});
