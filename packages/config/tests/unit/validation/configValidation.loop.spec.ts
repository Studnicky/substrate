import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ModuleError } from '@studnicky/errors';

import { ConfigValidation } from '../../../src/validation/configValidation.js';
import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';

import scenarioGroups from './configValidation.scenarios.json';

function fixtureFunction(): void {
  return undefined;
}

type ScenarioInputShape =
  | 'function'
  | 'infinity'
  | 'nan'
  | 'negativeInfinity'
  | 'null'
  | 'objectWithMethod'
  | 'throwingGetter'
  | 'throwingGetterNonError'
  | 'undefined';

type ScenarioInputToken = {
  readonly errorMessage?: string;
  readonly shape: ScenarioInputShape;
  readonly method?: string;
  readonly thrownValue?: string;
};

type ScenarioInput =
  | null
  | number
  | boolean
  | string
  | readonly ScenarioInput[]
  | { readonly [key: string]: ScenarioInput }
  | ScenarioInputToken;

type ScenarioOutcome = 'returns' | { readonly shape?: 'throwsError'; readonly message: string };

type ScenarioCase = {
  readonly description: string;
  readonly input: ScenarioInput;
  readonly knownKeys?: readonly string[];
  readonly method?: string;
  readonly min?: number;
  readonly name?: string;
  readonly outcome: ScenarioOutcome;
};

type ScenarioGroupName =
  | 'assertBoolean'
  | 'assertFinite'
  | 'assertFunction'
  | 'assertFunctionOrObjectWithMethod'
  | 'assertHasMethod'
  | 'assertInteger'
  | 'assertMin'
  | 'assertNoUnknownKeys'
  | 'assertNonNegative'
  | 'assertNumber'
  | 'assertPositive'
  | 'assertPositiveOrInfinity'
  | 'assertString';

type AssertionContext = {
  readonly input: unknown;
  readonly methodName: string;
  readonly scenario: ScenarioCase;
  readonly validationName: string;
};

type NormalizedOutcome =
  | { readonly shape: 'configuration-error'; readonly message: string }
  | { readonly shape: 'returns' }
  | { readonly shape: 'throwsError'; readonly message: string };

type OutcomeContext = {
  readonly invoke: () => void;
  readonly outcome: NormalizedOutcome;
};

type ConfigAssertion = (context: AssertionContext) => void;
type OutcomeAssertion = (context: OutcomeContext) => void;

const typedScenarioGroups: Record<ScenarioGroupName, readonly ScenarioCase[]> = scenarioGroups;

const scenarioGroupNames: readonly ScenarioGroupName[] = [
  'assertString',
  'assertNumber',
  'assertBoolean',
  'assertFunction',
  'assertInteger',
  'assertFinite',
  'assertNonNegative',
  'assertPositive',
  'assertMin',
  'assertPositiveOrInfinity',
  'assertHasMethod',
  'assertFunctionOrObjectWithMethod',
  'assertNoUnknownKeys'
];

function requiredString(value: string | undefined, label: string): string {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function requiredNumber(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function requiredMessage(outcome: NormalizedOutcome): string {
  if (outcome.shape === 'returns') {
    throw new Error('message outcome is required');
  }
  return outcome.message;
}

function requiredRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(label);
  }
  return value;
}

const inputMaterializers: Record<ScenarioInputShape, (value: ScenarioInputToken) => unknown> = {
  'function': (): (() => void) => fixtureFunction,
  'infinity': (): number => Infinity,
  'nan': (): number => NaN,
  'negativeInfinity': (): number => -Infinity,
  'null': (): null => null,
  'objectWithMethod': (value): Record<string, () => void> => ({
    [requiredString(value.method, 'objectWithMethod.method')]: fixtureFunction
  }),
  'throwingGetter': (value): object => {
    const boom = new Error(requiredString(value.errorMessage, 'throwingGetter.errorMessage'));
    return Object.defineProperty({}, requiredString(value.method, 'throwingGetter.method'), {
      'enumerable': true,
      get(): never {
        throw boom;
      }
    });
  },
  'throwingGetterNonError': (value): object => Object.defineProperty({}, requiredString(value.method, 'throwingGetterNonError.method'), {
    'enumerable': true,
    get(): never {
      throw requiredString(value.thrownValue, 'throwingGetterNonError.thrownValue');
    }
  }),
  'undefined': (): undefined => undefined
};

function isScenarioInputToken(value: object): value is ScenarioInputToken {
  const shape = 'shape' in value ? value.shape : undefined;
  return typeof shape === 'string' && Object.hasOwn(inputMaterializers, shape);
}

function materialize(value: ScenarioInput): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => materialize(entry));
  }
  if (isScenarioInputToken(value)) {
    return inputMaterializers[value.shape](value);
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, materialize(entry)]));
}

function normalizeOutcome(outcome: ScenarioOutcome): NormalizedOutcome {
  if (outcome === 'returns') {
    return { 'shape': 'returns' };
  }
  return {
    'shape': outcome.shape ?? 'configuration-error',
    'message': outcome.message
  };
}

const configAssertions: Record<ScenarioGroupName, ConfigAssertion> = {
  'assertBoolean': ({ input, validationName }): void => {
    ConfigValidation.assertBoolean(input, validationName);
  },
  'assertFinite': ({ input, validationName }): void => {
    ConfigValidation.assertFinite(input, validationName);
  },
  'assertFunction': ({ input, validationName }): void => {
    ConfigValidation.assertFunction(input, validationName);
  },
  'assertFunctionOrObjectWithMethod': ({ input, methodName, validationName }): void => {
    ConfigValidation.assertFunctionOrObjectWithMethod(input, methodName, validationName);
  },
  'assertHasMethod': ({ input, methodName, validationName }): void => {
    ConfigValidation.assertHasMethod(input, methodName, validationName);
  },
  'assertInteger': ({ input, validationName }): void => {
    ConfigValidation.assertInteger(input, validationName);
  },
  'assertMin': ({ input, scenario, validationName }): void => {
    ConfigValidation.assertMin(input, requiredNumber(scenario.min, 'assertMin.min'), validationName);
  },
  'assertNoUnknownKeys': ({ input, scenario }): void => {
    ConfigValidation.assertNoUnknownKeys(requiredRecord(input, 'assertNoUnknownKeys scenarios require a record input'), new Set(scenario.knownKeys ?? []));
  },
  'assertNonNegative': ({ input, validationName }): void => {
    ConfigValidation.assertNonNegative(input, validationName);
  },
  'assertNumber': ({ input, validationName }): void => {
    ConfigValidation.assertNumber(input, validationName);
  },
  'assertPositive': ({ input, validationName }): void => {
    ConfigValidation.assertPositive(input, validationName);
  },
  'assertPositiveOrInfinity': ({ input, validationName }): void => {
    ConfigValidation.assertPositiveOrInfinity(input, validationName);
  },
  'assertString': ({ input, validationName }): void => {
    ConfigValidation.assertString(input, validationName);
  }
};

const outcomeAssertions: Record<NormalizedOutcome['shape'], OutcomeAssertion> = {
  'configuration-error': ({ invoke, outcome }): void => {
    assert.throws(invoke, (err: unknown) => {
      assert.ok(err instanceof ConfigurationError);
      assert.strictEqual(err.message, requiredMessage(outcome));
      return true;
    });
  },
  'returns': ({ invoke }): void => {
    assert.doesNotThrow(invoke);
  },
  'throwsError': ({ invoke, outcome }): void => {
    try {
      invoke();
      assert.fail('expected exotic getter to throw');
    } catch (err: unknown) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, requiredMessage(outcome));
      assert.ok(!(err instanceof ConfigurationError));
    }
  }
};

for (const groupName of scenarioGroupNames) {
  void describe(groupName, () => {
    for (const scenario of typedScenarioGroups[groupName]) {
      void it(scenario.description, () => {
        const validationName = scenario.name ?? 'value';
        const context: AssertionContext = {
          'input': materialize(scenario.input),
          'methodName': scenario.method ?? validationName,
          'scenario': scenario,
          'validationName': validationName
        };
        const outcome = normalizeOutcome(scenario.outcome);

        outcomeAssertions[outcome.shape]({
          'invoke': () => {
            configAssertions[groupName](context);
          },
          'outcome': outcome
        });
      });
    }
  });
}

void describe('ConfigValidation subclass extension', () => {
  class StrictConfigValidation extends ConfigValidation {
    protected static override onValidationError(message: string): never {
      throw ModuleError.create(message, { scenario: 'CONFIGURATION' });
    }
  }

  void it('throws ModuleError (not ConfigurationError) when overridden', () => {
    assert.throws(
      () => StrictConfigValidation.assertString(42, 'field'),
      (err: unknown) => {
        assert.ok(err instanceof ModuleError, 'expected ModuleError');
        assert.ok(!(err instanceof ConfigurationError), 'should not be ConfigurationError');
        return true;
      }
    );
  });

  void it('override error carries the validation message', () => {
    assert.throws(
      () => StrictConfigValidation.assertNumber('oops', 'count'),
      (err: unknown) => {
        assert.ok(err instanceof ModuleError);
        assert.strictEqual(err.message, 'count must be a number');
        return true;
      }
    );
  });

  void it('base ConfigValidation still throws ConfigurationError', () => {
    assert.throws(
      () => ConfigValidation.assertString(42, 'field'),
      ConfigurationError
    );
  });
});
