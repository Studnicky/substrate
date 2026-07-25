import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UrlUtils } from '../../../src/index.js';
import scenarioGroups from './query.scenarios.json';

type RuntimeTag = { shape: 'undefined' };
type RuntimeValue =
  | RuntimeTag
  | RuntimeValue[]
  | boolean
  | null
  | number
  | string
  | { [key: string]: RuntimeValue };

type ScenarioShape =
  | 'buildQueryString-object'
  | 'buildQueryString-string'
  | 'buildQueryString-boolean'
  | 'buildQueryString-array'
  | 'buildQueryString-skip-null-undefined'
  | 'buildQueryString-skip-null-array-items'
  | 'buildQueryString-empty-object'
  | 'buildQueryString-encode-special-chars'
  | 'buildQueryString-number'
  | 'buildUrl-append-query'
  | 'buildUrl-existing-query'
  | 'buildUrl-full-url'
  | 'buildUrl-no-params'
  | 'buildUrl-empty-params'
  | 'buildUrl-nullish-only'
  | 'buildUrl-array-params'
  | 'parseQueryString-basic'
  | 'parseQueryString-leading-question-mark'
  | 'parseQueryString-repeated-keys'
  | 'parseQueryString-decode-values'
  | 'parseQueryString-empty-string'
  | 'parseQueryString-just-question-mark'
  | 'parseQueryString-keys-without-values'
  | 'parseQueryString-mixed-single-and-repeated';

type ScenarioCase = {
  description: string;
  expected: { output: RuntimeValue };
  input: {
    baseUrl?: string;
    params?: { [key: string]: RuntimeValue };
    queryString?: string;
  };
  shape: ScenarioShape;
  name: string;
};

type RuntimeTagMaterializer = (value: RuntimeTag) => unknown;
type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

const { buildQueryString, buildUrl, parseQueryString } = UrlUtils;

const runtimeTagMap: Record<RuntimeTag['shape'], RuntimeTagMaterializer> = {
  undefined: () => undefined
};

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.shape === 'string' &&
    value.shape in runtimeTagMap
  );
}

function materializeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeValue(item); });
  }

  if (value !== null && typeof value === 'object') {
    if (isRuntimeTag(value)) {
      return runtimeTagMap[value.shape](value);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, materializeValue(nested)])
    );
  }

  return value;
}

function requireString(value: string | undefined, label: string): string {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }

  return value;
}

function requireParams(value: { [key: string]: RuntimeValue } | undefined): { [key: string]: RuntimeValue } {
  if (value === undefined) {
    throw new Error('params are required');
  }

  return value;
}

function materializeParams(params: { [key: string]: RuntimeValue }): Record<string, unknown> {
  return materializeValue(params) as Record<string, unknown>;
}

function runBuildQueryString(scenarioCase: ScenarioCase): void {
  assert.strictEqual(
    buildQueryString(materializeParams(requireParams(scenarioCase.input.params))),
    scenarioCase.expected.output
  );
}

function runBuildUrl(scenarioCase: ScenarioCase): void {
  assert.strictEqual(
    buildUrl(
      requireString(scenarioCase.input.baseUrl, 'baseUrl'),
      materializeParams(requireParams(scenarioCase.input.params))
    ),
    scenarioCase.expected.output
  );
}

function runBuildUrlWithoutParams(scenarioCase: ScenarioCase): void {
  assert.strictEqual(buildUrl(requireString(scenarioCase.input.baseUrl, 'baseUrl')), scenarioCase.expected.output);
}

function runParseQueryString(scenarioCase: ScenarioCase): void {
  assert.deepStrictEqual(
    parseQueryString(requireString(scenarioCase.input.queryString, 'queryString')),
    scenarioCase.expected.output
  );
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'buildQueryString-array': runBuildQueryString,
  'buildQueryString-boolean': runBuildQueryString,
  'buildQueryString-empty-object': runBuildQueryString,
  'buildQueryString-encode-special-chars': runBuildQueryString,
  'buildQueryString-number': runBuildQueryString,
  'buildQueryString-object': runBuildQueryString,
  'buildQueryString-skip-null-array-items': runBuildQueryString,
  'buildQueryString-skip-null-undefined': runBuildQueryString,
  'buildQueryString-string': runBuildQueryString,
  'buildUrl-append-query': runBuildUrl,
  'buildUrl-array-params': runBuildUrl,
  'buildUrl-empty-params': runBuildUrl,
  'buildUrl-existing-query': runBuildUrl,
  'buildUrl-full-url': runBuildUrl,
  'buildUrl-no-params': runBuildUrlWithoutParams,
  'buildUrl-nullish-only': runBuildUrl,
  'parseQueryString-basic': runParseQueryString,
  'parseQueryString-decode-values': runParseQueryString,
  'parseQueryString-empty-string': runParseQueryString,
  'parseQueryString-just-question-mark': runParseQueryString,
  'parseQueryString-keys-without-values': runParseQueryString,
  'parseQueryString-leading-question-mark': runParseQueryString,
  'parseQueryString-mixed-single-and-repeated': runParseQueryString,
  'parseQueryString-repeated-keys': runParseQueryString
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('fetch query utils', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
