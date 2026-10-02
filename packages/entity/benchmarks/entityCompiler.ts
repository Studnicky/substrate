import { EntityCompiler } from '../dist/node/index.js';

const WARM_ITERATIONS = 200_000;
const WARMUP_ITERATIONS = 20_000;
const SAMPLE_COUNT = 7;
const COMPILE_ITERATIONS = 1_000;

const SIMPLE_SCHEMA = {
  'properties': {
    'city': { 'minLength': 1, 'type': 'string' },
    'country': { 'minLength': 2, 'type': 'string' },
    'email': { 'minLength': 3, 'type': 'string' },
    'name': { 'minLength': 1, 'type': 'string' },
    'postalCode': { 'minLength': 3, 'type': 'string' }
  },
  'required': ['city', 'country', 'email', 'name', 'postalCode'],
  'type': 'object'
};

const SIMPLE_VALUE = {
  'city': 'New York',
  'country': 'US',
  'email': 'dev@example.test',
  'name': 'Substrate',
  'postalCode': '10001'
};

const REFERENCE_SCHEMA = {
  '$defs': {
    'token': { 'minLength': 1, 'type': 'string' }
  },
  'properties': {
    'nested': {
      'properties': {
        'first': { '$ref': '#/$defs/token' },
        'second': { '$ref': '#/$defs/token' }
      },
      'required': ['first', 'second'],
      'type': 'object'
    }
  },
  'required': ['nested'],
  'type': 'object'
};

const REFERENCE_VALUE = {
  'nested': { 'first': 'alpha', 'second': 'beta' }
};

const MULTI_ERROR_VALUE = {
  'city': 1,
  'country': 2,
  'email': 3,
  'name': 4,
  'postalCode': 5
};

function measureMicroseconds(operation: () => void): number {
  const start = process.hrtime.bigint();
  operation();
  return Number(process.hrtime.bigint() - start) / 1_000;
}

function measureMedianAverageMicroseconds(iterations: number, operation: () => void): number {
  for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration += 1) {
    operation();
  }

  const samples: number[] = [];
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    samples.push(measureAverageMicroseconds(iterations, operation));
  }
  samples.sort((first, second): number => first - second);

  const median = samples.at(Math.floor(SAMPLE_COUNT / 2));
  if (median === undefined) {
    throw new Error('EntityCompiler benchmark produced no samples.');
  }
  return median;
}

function measureAverageMicroseconds(iterations: number, operation: () => void): number {
  const elapsedMicroseconds = measureMicroseconds((): void => {
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      operation();
    }
  });
  return elapsedMicroseconds / iterations;
}

function requireValid(validate: (value: unknown) => boolean, value: unknown): void {
  if (!validate(value)) {
    throw new Error('EntityCompiler rejected the benchmark valid value.');
  }
}

function requireFiveErrors(validate: { (value: unknown): boolean; readonly 'errors'?: readonly unknown[] | null }): void {
  if (validate(MULTI_ERROR_VALUE)) {
    throw new Error('EntityCompiler accepted the benchmark invalid value.');
  }
  if (validate.errors?.length !== 5) {
    throw new Error(`EntityCompiler reported ${String(validate.errors?.length)} errors for the five-error benchmark value.`);
  }
}

function readErrors(validate: { readonly 'errors'?: readonly unknown[] | null }): readonly unknown[] | null | undefined {
  return validate.errors;
}

const simpleValidate = EntityCompiler.compile(SIMPLE_SCHEMA);
const referenceValidate = EntityCompiler.compile(REFERENCE_SCHEMA);
const errorValidate = EntityCompiler.compile(SIMPLE_SCHEMA);

requireValid(simpleValidate, SIMPLE_VALUE);
requireValid(referenceValidate, REFERENCE_VALUE);
requireFiveErrors(errorValidate);

const compileMicroseconds = measureMedianAverageMicroseconds(COMPILE_ITERATIONS, (): void => {
  EntityCompiler.compile(SIMPLE_SCHEMA);
});

const firstValidationMicroseconds = measureMedianAverageMicroseconds(1, (): void => {
  const validate = EntityCompiler.compile(SIMPLE_SCHEMA);
  validate(SIMPLE_VALUE);
});

const warmedValidMicroseconds = measureMedianAverageMicroseconds(WARM_ITERATIONS, (): void => {
  simpleValidate(SIMPLE_VALUE);
});

const warmedReferenceMicroseconds = measureMedianAverageMicroseconds(WARM_ITERATIONS, (): void => {
  referenceValidate(REFERENCE_VALUE);
});

const multiErrorRawMicroseconds = measureMedianAverageMicroseconds(WARM_ITERATIONS, (): void => {
  errorValidate(MULTI_ERROR_VALUE);
});

const multiErrorErrorReadMicroseconds = measureMedianAverageMicroseconds(WARM_ITERATIONS, (): void => {
  readErrors(errorValidate);
});

const multiErrorWithErrorReadMicroseconds = measureMedianAverageMicroseconds(WARM_ITERATIONS, (): void => {
  errorValidate(MULTI_ERROR_VALUE);
  readErrors(errorValidate);
});

const report = {
  'iterations': {
    'compile': COMPILE_ITERATIONS,
    'samples': SAMPLE_COUNT,
    'warmup': WARMUP_ITERATIONS,
    'warmedValidation': WARM_ITERATIONS
  },
  'microseconds': {
    'compile': compileMicroseconds,
    'firstValidation': firstValidationMicroseconds,
    'multiErrorErrorRead': multiErrorErrorReadMicroseconds,
    'multiErrorRawInvocation': multiErrorRawMicroseconds,
    'multiErrorWithErrorRead': multiErrorWithErrorReadMicroseconds,
    'warmedReference': warmedReferenceMicroseconds,
    'warmedValid': warmedValidMicroseconds
  },
  'runtime': {
    'node': process.version,
    'platform': process.platform
  }
};

process.stdout.write(`${JSON.stringify(report)}\n`);
