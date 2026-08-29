import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  createCompilerHost,
  createProgram,
  createSourceFile,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget
} from 'typescript';

import { IdempotencyConflictError, IdempotencyGuard } from '../../../src/index.js';
import { IdempotencyGuardEntryMetadataEntity, IdempotencyPayloadEntity } from '../../../src/entities/index.js';

import scenarioGroups from './idempotency-guard.scenarios.json' with { type: 'json' };

// Shared placeholder for a deferred-promise resolver that is always reassigned before use.
const NOOP_STRING_RESOLVER: (value: string) => void = () => {};

type ScenarioFixture = (typeof scenarioGroups.cases)[number];
type GuardOptions = ScenarioFixture['input']['idempotencyGuard'];
type GuardFactory<TResult> = () => TResult | Promise<TResult>;

/**
 * `scenarioGroups.cases` is loaded via `resolveJsonModule`, which widens every JSON literal
 * (including `shape`) to its base type (`string`, `number`, …). That makes `ScenarioFixture['shape']`
 * plain `string` rather than a literal union, so `Extract` on it can never narrow — every scenario
 * handler would otherwise receive the full union of all fixture shapes. `ScenarioCase` restates the
 * true per-shape contract by hand so `shape` is a real discriminant, and `assertScenarioShape` below
 * performs the runtime check that lets TypeScript narrow a loose `ScenarioFixture` down to one member.
 */
type ScenarioCase =
  | {
      shape: 'metadata-accepts-string-fingerprint';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; fingerprint: string };
      expected: { valid: boolean };
    }
  | {
      shape: 'metadata-rejects-invalid-fingerprint';
      name: string;
      description: string;
      input: {
        idempotencyGuard: GuardOptions;
        missingFingerprint: Record<string, never>;
        numericFingerprint: { fingerprint: number };
      };
      expected: { missingValid: boolean; numericValid: boolean };
    }
  | {
      shape: 'coalesce-shares-one-execution';
      name: string;
      description: string;
      input: {
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
        batch: { calls: number; factoryResult: string };
      };
      expected: { calls: number; result: string };
    }
  | {
      shape: 'result-contract-owned';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { operand: number } };
      expected: { initial: number; replayed: number; type: string };
    }
  | {
      shape: 'result-contract-rejects-invalid-factory';
      name: string;
      description: string;
      input: { fixture: string; idempotencyGuard: GuardOptions; key: string; payload: Record<string, never> };
      expected: { diagnosticsCount: number; messagePattern: string };
    }
  | {
      shape: 'conflict-same-key-different-payload';
      name: string;
      description: string;
      input: {
        conflictingPayload: { amount: number };
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
      };
      expected: { calls: number };
    }
  | {
      shape: 'conflict-exposes-key';
      name: string;
      description: string;
      input: {
        conflictingPayload: { amount: number };
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
      };
      expected: { code: string; key: string; result: string };
    }
  | {
      shape: 'replay-accepts-sync-factory';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { result: { chargeId: string } };
    }
  | {
      shape: 'replay-cached-result';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { calls: number; firstResult: { chargeId: string }; secondResult: { chargeId: string } };
    }
  | {
      shape: 'replay-expired-entry-reruns';
      name: string;
      description: string;
      input: { expirationWaitMs: number; idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { calls: number; second: string };
    }
  | {
      shape: 'hooks-execute-new-key';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { conflicted: never[]; executed: string[]; replayed: never[] };
    }
  | {
      shape: 'hooks-execute-before-factory';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { events: string[] };
    }
  | {
      shape: 'hooks-replay-match';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { executed: string[]; replayed: string[] };
    }
  | {
      shape: 'hooks-conflict-before-throw';
      name: string;
      description: string;
      input: {
        conflictingPayload: { amount: number };
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
      };
      expected: { conflicted: string[] };
    }
  | {
      shape: 'hooks-coalesce-follower';
      name: string;
      description: string;
      input: {
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
        batch: { calls: number; factoryResult: string };
      };
      expected: { coalesced: string[]; executed: string[] };
    }
  | {
      shape: 'hooks-isolated-instances';
      name: string;
      description: string;
      input: {
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
        batch: { callsPerInstance: number; factoryResults: string[] };
      };
      expected: {
        firstEvents: string[];
        firstFactoryCalls: number;
        results: string[];
        secondEvents: string[];
        secondFactoryCalls: number;
      };
    }
  | {
      shape: 'hooks-throwing-replay';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { result: string };
    }
  | {
      shape: 'hooks-throwing-conflict';
      name: string;
      description: string;
      input: {
        conflictingPayload: { amount: number };
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
      };
      expected: { result: string };
    }
  | {
      shape: 'hooks-throwing-execute';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { result: string };
    }
  | {
      shape: 'hooks-sync-replay-swallowed';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { result: string };
    }
  | {
      shape: 'hooks-async-replay-safe';
      name: string;
      description: string;
      input: { idempotencyGuard: GuardOptions; key: string; payload: { amount: number } };
      expected: { rejections: number; result: string };
    }
  | {
      shape: 'hooks-throwing-coalesce';
      name: string;
      description: string;
      input: {
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
        batch: { calls: number; factoryResult: string };
      };
      expected: { followerResult: string; leaderResult: string };
    }
  | {
      shape: 'hooks-async-overrides-safe';
      name: string;
      description: string;
      input: {
        conflictingPayload: { amount: number };
        idempotencyGuard: GuardOptions;
        key: string;
        payload: { amount: number };
        batch: { calls: number; factoryResult: string };
      };
      expected: { events: string[]; rejections: number; result: string };
    }
  | {
      shape: 'race-concurrent-different-payload';
      name: string;
      description: string;
      input: {
        followerPayload: { amount: number };
        idempotencyGuard: GuardOptions;
        key: string;
        leaderPayload: { amount: number };
        batch: { followerResult: string; leaderResult: string; replayResult: string };
      };
      expected: {
        followerCalls: number;
        leaderCalls: number;
        leaderResult: string;
        replayed: string;
        replayFactoryCalls: number;
      };
    };
type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner = (scenario: ScenarioFixture) => Promise<void> | void;
type ScenarioRunnerMap = Record<ScenarioShape, ScenarioRunner>;

/**
 * `scenarioGroups.cases` is loaded via `resolveJsonModule`, which widens every JSON literal
 * (including `shape`) to its base type (`string`), so `ScenarioFixture['shape']` is plain `string`
 * rather than a literal union — a single generic `Extract`-based assertion cannot be proven
 * assignable back to `ScenarioFixture` for an arbitrary type parameter (TS2677), even though each
 * concrete instantiation is sound. These per-shape assertions narrow a loose `ScenarioFixture` down
 * to the matching `ScenarioCase` member, verified at runtime.
 */

function assertScenarioMetadataAcceptsStringFingerprint(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'metadata-accepts-string-fingerprint' }> {
  if (scenario.shape !== 'metadata-accepts-string-fingerprint') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "metadata-accepts-string-fingerprint", received "${scenario.shape}"`);
  }
}

function assertScenarioMetadataRejectsInvalidFingerprint(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'metadata-rejects-invalid-fingerprint' }> {
  if (scenario.shape !== 'metadata-rejects-invalid-fingerprint') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "metadata-rejects-invalid-fingerprint", received "${scenario.shape}"`);
  }
}

function assertScenarioCoalesceSharesOneExecution(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'coalesce-shares-one-execution' }> {
  if (scenario.shape !== 'coalesce-shares-one-execution') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "coalesce-shares-one-execution", received "${scenario.shape}"`);
  }
}

function assertScenarioResultContractOwned(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'result-contract-owned' }> {
  if (scenario.shape !== 'result-contract-owned') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "result-contract-owned", received "${scenario.shape}"`);
  }
}

function assertScenarioResultContractRejectsInvalidFactory(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'result-contract-rejects-invalid-factory' }> {
  if (scenario.shape !== 'result-contract-rejects-invalid-factory') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "result-contract-rejects-invalid-factory", received "${scenario.shape}"`);
  }
}

function assertScenarioConflictSameKeyDifferentPayload(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'conflict-same-key-different-payload' }> {
  if (scenario.shape !== 'conflict-same-key-different-payload') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "conflict-same-key-different-payload", received "${scenario.shape}"`);
  }
}

function assertScenarioConflictExposesKey(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'conflict-exposes-key' }> {
  if (scenario.shape !== 'conflict-exposes-key') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "conflict-exposes-key", received "${scenario.shape}"`);
  }
}

function assertScenarioReplayAcceptsSyncFactory(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'replay-accepts-sync-factory' }> {
  if (scenario.shape !== 'replay-accepts-sync-factory') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "replay-accepts-sync-factory", received "${scenario.shape}"`);
  }
}

function assertScenarioReplayCachedResult(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'replay-cached-result' }> {
  if (scenario.shape !== 'replay-cached-result') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "replay-cached-result", received "${scenario.shape}"`);
  }
}

function assertScenarioReplayExpiredEntryReruns(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'replay-expired-entry-reruns' }> {
  if (scenario.shape !== 'replay-expired-entry-reruns') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "replay-expired-entry-reruns", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksExecuteNewKey(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-execute-new-key' }> {
  if (scenario.shape !== 'hooks-execute-new-key') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-execute-new-key", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksExecuteBeforeFactory(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-execute-before-factory' }> {
  if (scenario.shape !== 'hooks-execute-before-factory') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-execute-before-factory", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksReplayMatch(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-replay-match' }> {
  if (scenario.shape !== 'hooks-replay-match') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-replay-match", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksConflictBeforeThrow(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-conflict-before-throw' }> {
  if (scenario.shape !== 'hooks-conflict-before-throw') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-conflict-before-throw", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksCoalesceFollower(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-coalesce-follower' }> {
  if (scenario.shape !== 'hooks-coalesce-follower') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-coalesce-follower", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksIsolatedInstances(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-isolated-instances' }> {
  if (scenario.shape !== 'hooks-isolated-instances') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-isolated-instances", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksThrowingReplay(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-throwing-replay' }> {
  if (scenario.shape !== 'hooks-throwing-replay') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-throwing-replay", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksThrowingConflict(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-throwing-conflict' }> {
  if (scenario.shape !== 'hooks-throwing-conflict') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-throwing-conflict", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksThrowingExecute(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-throwing-execute' }> {
  if (scenario.shape !== 'hooks-throwing-execute') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-throwing-execute", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksSyncReplaySwallowed(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-sync-replay-swallowed' }> {
  if (scenario.shape !== 'hooks-sync-replay-swallowed') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-sync-replay-swallowed", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksAsyncReplaySafe(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-async-replay-safe' }> {
  if (scenario.shape !== 'hooks-async-replay-safe') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-async-replay-safe", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksThrowingCoalesce(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-throwing-coalesce' }> {
  if (scenario.shape !== 'hooks-throwing-coalesce') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-throwing-coalesce", received "${scenario.shape}"`);
  }
}

function assertScenarioHooksAsyncOverridesSafe(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'hooks-async-overrides-safe' }> {
  if (scenario.shape !== 'hooks-async-overrides-safe') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "hooks-async-overrides-safe", received "${scenario.shape}"`);
  }
}

function assertScenarioRaceConcurrentDifferentPayload(
  scenario: ScenarioFixture
): asserts scenario is Extract<ScenarioCase, { shape: 'race-concurrent-different-payload' }> {
  if (scenario.shape !== 'race-concurrent-different-payload') {
    throw RuntimeError.create(`Scenario shape mismatch: expected "race-concurrent-different-payload", received "${scenario.shape}"`);
  }
}

type PayloadMaterializerMap = {
  conflicting: (input: { conflictingPayload: IdempotencyPayloadEntity.Type }) => IdempotencyPayloadEntity.Type;
  follower: (input: { followerPayload: IdempotencyPayloadEntity.Type }) => IdempotencyPayloadEntity.Type;
  leader: (input: { leaderPayload: IdempotencyPayloadEntity.Type }) => IdempotencyPayloadEntity.Type;
  primary: (input: { payload: IdempotencyPayloadEntity.Type }) => IdempotencyPayloadEntity.Type;
};
type DiagnosticPatternPredicate = (diagnostic: string) => boolean;

const diagnosticPatternPredicates: Record<string, DiagnosticPatternPredicate> = {
  "Type 'string' is not assignable to type 'number \\| Promise<number>'": (diagnostic) => diagnostic.includes("Type 'string' is not assignable to type 'number | Promise<number>'")
};

class ResultContractCompiler {
  static diagnostics(input: { fixture: string; idempotencyGuard: GuardOptions; key: string; payload: IdempotencyPayloadEntity.Type }): string[] {
    const guardOptions = input.idempotencyGuard;
    const fileName = fileURLToPath(new URL(`../../fixtures/${input.fixture}`, import.meta.url));
    const source = `
      import { IdempotencyGuard } from '../../src/index.js';
      import { IdempotencyPayloadEntity } from '../../src/entities/index.js';

      const direct = IdempotencyGuard.create<number>({ capacity: ${guardOptions.capacity}, ttlMs: ${guardOptions.ttlMs} });
      await direct.run(${sourceStringLiteral(scenarioKey(input))}, IdempotencyPayloadEntity.create(${sourceLiteral(scenarioPayload(input))}), () => 'wrong');
    `;
    const options = {
      module: ModuleKind.NodeNext,
      moduleResolution: ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: ScriptTarget.ES2022
    };
    const host = createCompilerHost(options);
    const fileExists = host.fileExists.bind(host);
    const getSourceFile = host.getSourceFile.bind(host);
    const readFile = host.readFile.bind(host);

    host.fileExists = (candidate): boolean => candidate === fileName || fileExists(candidate);
    host.readFile = (candidate): string | undefined => candidate === fileName ? source : readFile(candidate);
    host.getSourceFile = (candidate, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (candidate === fileName) {
        return createSourceFile(candidate, source, languageVersion, true);
      }
      return getSourceFile(candidate, languageVersion, onError, shouldCreateNewSourceFile);
    };

    const program = createProgram([fileName], options, host);
    return getPreEmitDiagnostics(program)
      .filter((diagnostic) => diagnostic.file?.fileName === fileName && diagnostic.code === 2322)
      .map((diagnostic) => flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
}

class TrackingGuard extends IdempotencyGuard<string> {
  readonly replayed: string[] = [];
  readonly coalesced: string[] = [];
  readonly conflicted: string[] = [];
  readonly executed: string[] = [];

  static tracked(options: GuardOptions): TrackingGuard {
    return new TrackingGuard(options);
  }

  protected override onReplay(key: string): void {
    this.replayed.push(key);
  }

  protected override onCoalesce(key: string): void {
    this.coalesced.push(key);
  }

  protected override onConflict(key: string): void {
    this.conflicted.push(key);
  }

  protected override onExecute(key: string): void {
    this.executed.push(key);
  }
}

function createGuard<TResult>(options: GuardOptions): IdempotencyGuard<TResult> {
  return IdempotencyGuard.create<TResult>(options);
}

function sourceLiteral(value: IdempotencyPayloadEntity.Type): string {
  const literal = JSON.stringify(value);
  if (literal === undefined) {
    throw RuntimeError.create('Scenario fixture is not JSON serializable');
  }
  return literal;
}

function sourceStringLiteral(value: string): string {
  return JSON.stringify(value);
}

function scenarioKey(input: { key: string }): string {
  return input.key;
}

const payloadMaterializers: PayloadMaterializerMap = {
  conflicting(input) {
    return IdempotencyPayloadEntity.create(structuredClone(input.conflictingPayload));
  },
  follower(input) {
    return IdempotencyPayloadEntity.create(structuredClone(input.followerPayload));
  },
  leader(input) {
    return IdempotencyPayloadEntity.create(structuredClone(input.leaderPayload));
  },
  primary(input) {
    return IdempotencyPayloadEntity.create(structuredClone(input.payload));
  }
};

function scenarioPayload(input: { payload: IdempotencyPayloadEntity.Type }): IdempotencyPayloadEntity.Type {
  return payloadMaterializers.primary(input);
}

function scenarioConflictingPayload(
  input: { conflictingPayload: IdempotencyPayloadEntity.Type }
): IdempotencyPayloadEntity.Type {
  return payloadMaterializers.conflicting(input);
}

function scenarioLeaderPayload(input: { leaderPayload: IdempotencyPayloadEntity.Type }): IdempotencyPayloadEntity.Type {
  return payloadMaterializers.leader(input);
}

function scenarioFollowerPayload(input: { followerPayload: IdempotencyPayloadEntity.Type }): IdempotencyPayloadEntity.Type {
  return payloadMaterializers.follower(input);
}

function runScenarioInput<TResult, TInput extends { key: string; payload: IdempotencyPayloadEntity.Type }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult> {
  return guard.run(scenarioKey(input), scenarioPayload(input), factory);
}

function runConflictingScenarioInput<TResult, TInput extends { conflictingPayload: IdempotencyPayloadEntity.Type; key: string }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult> {
  return guard.run(scenarioKey(input), scenarioConflictingPayload(input), factory);
}

function runLeaderScenarioInput<TResult, TInput extends { key: string; leaderPayload: IdempotencyPayloadEntity.Type }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult> {
  return guard.run(scenarioKey(input), scenarioLeaderPayload(input), factory);
}

function runFollowerScenarioInput<TResult, TInput extends { followerPayload: IdempotencyPayloadEntity.Type; key: string }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult> {
  return guard.run(scenarioKey(input), scenarioFollowerPayload(input), factory);
}

function runScenarioInputBatch<TResult, TInput extends { batch: { calls: number }; key: string; payload: IdempotencyPayloadEntity.Type }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult[]> {
  return Promise.all(Array.from({ length: input.batch.calls }, () => runScenarioInput(guard, input, factory)));
}

function assertDiagnosticPattern(diagnostic: string, pattern: string): void {
  const predicate = diagnosticPatternPredicates[pattern];

  if (predicate === undefined) {
    throw RuntimeError.create(`Unsupported diagnostic message pattern scenario: ${pattern}`);
  }

  assert.equal(predicate(diagnostic), true);
}

function createTraceLogger(shape: string): { log: (message: string) => void; snapshot: () => string } {
  const lines: string[] = [];
  return {
    log(message: string): void {
      const line = `${shape}: ${message}`;
      lines.push(line);
      if (process.env.SUBSTATE_TEST_TRACE === '1') {
        console.error('%s', line);
      }
    },
    snapshot(): string {
      return lines.join('\n');
    }
  };
}

const scenarioRunners: ScenarioRunnerMap = {
  'metadata-accepts-string-fingerprint': (scenario) => {
    assertScenarioMetadataAcceptsStringFingerprint(scenario);
    assert.equal(
      IdempotencyGuardEntryMetadataEntity.validate({ fingerprint: scenario.input.fingerprint }),
      scenario.expected.valid
    );
  },

  'metadata-rejects-invalid-fingerprint': (scenario) => {
    assertScenarioMetadataRejectsInvalidFingerprint(scenario);
    assert.equal(
      IdempotencyGuardEntryMetadataEntity.validate(scenario.input.missingFingerprint),
      scenario.expected.missingValid
    );
    assert.equal(
      IdempotencyGuardEntryMetadataEntity.validate(scenario.input.numericFingerprint),
      scenario.expected.numericValid
    );
  },

  'coalesce-shares-one-execution': async (scenario) => {
    assertScenarioCoalesceSharesOneExecution(scenario);
    const trace = createTraceLogger(scenario.shape);
    const guard = createGuard<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;
    let resolveFactory: (value: string) => void = NOOP_STRING_RESOLVER;
    const pending = new Promise<string>((resolve) => {
      resolveFactory = resolve;
    });
    const factory = async (): Promise<string> => {
      calls += 1;
      trace.log(`factory-call:${calls}`);
      return await pending;
    };

    const results = runScenarioInputBatch(guard, input, factory);
    trace.log('leader-and-follower-scheduled');
    resolveFactory(input.batch.factoryResult);
    trace.log(`factory-resolved:${input.batch.factoryResult}`);

    const output = await results;
    assert.equal(calls, scenario.expected.calls, trace.snapshot());
    assert.deepEqual(
      output,
      Array.from({ length: input.batch.calls }, () => scenario.expected.result),
      trace.snapshot()
    );
  },

  'result-contract-owned': async (scenario) => {
    assertScenarioResultContractOwned(scenario);
    const guard = createGuard<number>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    const initial = await runScenarioInput(guard, input, () => scenario.expected.initial);
    const replayed = await runScenarioInput(guard, input, async () => 42);
    assert.equal(initial, scenario.expected.initial);
    assert.equal(replayed, scenario.expected.replayed);
    assert.equal(typeof replayed, scenario.expected.type);
  },

  'result-contract-rejects-invalid-factory': (scenario) => {
    assertScenarioResultContractRejectsInvalidFactory(scenario);
    const diagnostics = ResultContractCompiler.diagnostics(scenario.input);
    assert.equal(diagnostics.length, scenario.expected.diagnosticsCount);
    for (const diagnostic of diagnostics) {
      assertDiagnosticPattern(diagnostic, scenario.expected.messagePattern);
    }
  },

  'conflict-same-key-different-payload': async (scenario) => {
    assertScenarioConflictSameKeyDifferentPayload(scenario);
    const guard = createGuard<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;

    await runScenarioInput(guard, input, async () => {
      calls += 1;
      return 'ok';
    });

    await assert.rejects(
      async () => {
        await runConflictingScenarioInput(guard, input, async () => {
          calls += 1;
          return 'ok';
        });
      },
      IdempotencyConflictError
    );

    assert.equal(calls, scenario.expected.calls);
  },

  'conflict-exposes-key': async (scenario) => {
    assertScenarioConflictExposesKey(scenario);
    const guard = createGuard<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => scenario.expected.result);
    try {
      await runConflictingScenarioInput(guard, input, async () => scenario.expected.result);
      throw RuntimeError.create('expected IdempotencyConflictError to be thrown');
    } catch (error) {
      if (!(error instanceof IdempotencyConflictError)) {
        throw error;
      }
      assert.equal(error.key, scenario.expected.key);
      assert.equal(error.code, scenario.expected.code);
    }
  },

  'replay-accepts-sync-factory': async (scenario) => {
    assertScenarioReplayAcceptsSyncFactory(scenario);
    const guard = createGuard<{ chargeId: string }>(scenario.input.idempotencyGuard);
    const result = await runScenarioInput(guard, scenario.input, () => structuredClone(scenario.expected.result));
    assert.deepEqual(result, scenario.expected.result);
  },

  'replay-cached-result': async (scenario) => {
    assertScenarioReplayCachedResult(scenario);
    const guard = createGuard<{ chargeId: string }>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;
    const first = await runScenarioInput(guard, input, async () => {
      calls += 1;
      return structuredClone(scenario.expected.firstResult);
    });
    const second = await runScenarioInput(guard, input, async () => {
      calls += 1;
      return structuredClone(scenario.expected.secondResult);
    });
    assert.equal(calls, scenario.expected.calls);
    assert.deepEqual(first, scenario.expected.firstResult);
    assert.deepEqual(second, scenario.expected.firstResult);
  },

  'replay-expired-entry-reruns': async (scenario) => {
    assertScenarioReplayExpiredEntryReruns(scenario);
    const guard = createGuard<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;
    await runScenarioInput(guard, input, async () => {
      calls += 1;
      return 'first';
    });
    await new Promise((resolve) => {
      setTimeout(resolve, input.expirationWaitMs);
    });
    const second = await runScenarioInput(guard, input, async () => {
      calls += 1;
      return scenario.expected.second;
    });
    assert.equal(calls, scenario.expected.calls);
    assert.equal(second, scenario.expected.second);
  },

  'hooks-execute-new-key': async (scenario) => {
    assertScenarioHooksExecuteNewKey(scenario);
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => 'ok');
    assert.deepEqual(guard.executed, scenario.expected.executed);
    assert.deepEqual(guard.replayed, scenario.expected.replayed);
    assert.deepEqual(guard.conflicted, scenario.expected.conflicted);
  },

  'hooks-execute-before-factory': async (scenario) => {
    assertScenarioHooksExecuteBeforeFactory(scenario);
    const events: string[] = [];

    class OrderedGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): OrderedGuard {
        return new OrderedGuard(options);
      }

      protected override onExecute(): void {
        events.push('execute');
      }
    }

    const guard = OrderedGuard.tracked(scenario.input.idempotencyGuard);
    await runScenarioInput(guard, scenario.input, async () => {
      events.push('factory');
      return 'ok';
    });
    assert.deepEqual(events, scenario.expected.events);
  },

  'hooks-replay-match': async (scenario) => {
    assertScenarioHooksReplayMatch(scenario);
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => 'ok');
    await runScenarioInput(guard, input, async () => 'ok');
    assert.deepEqual(guard.executed, scenario.expected.executed);
    assert.deepEqual(guard.replayed, scenario.expected.replayed);
  },

  'hooks-conflict-before-throw': async (scenario) => {
    assertScenarioHooksConflictBeforeThrow(scenario);
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => 'ok');
    await runConflictingScenarioInput(guard, input, async () => 'ok').catch((error: Error) => {
      if (!(error instanceof IdempotencyConflictError)) {
        throw error;
      }
    });
    assert.deepEqual(guard.conflicted, scenario.expected.conflicted);
  },

  'hooks-coalesce-follower': async (scenario) => {
    assertScenarioHooksCoalesceFollower(scenario);
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let resolveFactory: (value: string) => void = NOOP_STRING_RESOLVER;
    const pending = new Promise<string>((resolve) => {
      resolveFactory = resolve;
    });
    const factory = async (): Promise<string> => await pending;
    const results = runScenarioInputBatch(guard, input, factory);
    resolveFactory(input.batch.factoryResult);
    await results;
    assert.deepEqual(guard.executed, scenario.expected.executed);
    assert.deepEqual(guard.coalesced, scenario.expected.coalesced);
  },

  'hooks-isolated-instances': async (scenario) => {
    assertScenarioHooksIsolatedInstances(scenario);
    class IsolatedTrackingGuard extends IdempotencyGuard<string> {
      readonly events: string[] = [];

      static tracked(options: GuardOptions): IsolatedTrackingGuard {
        return new IsolatedTrackingGuard(options);
      }

      protected override onExecute(key: string): void {
        this.events.push(`execute:${key}`);
      }

      protected override onCoalesce(key: string): void {
        this.events.push(`coalesce:${key}`);
      }
    }

    type IsolatedExecution = {
      readonly factory: GuardFactory<string>;
      readonly factoryCalls: () => number;
      readonly guard: IsolatedTrackingGuard;
      readonly resolve: (value: string) => void;
      readonly result: string;
    };

    const executions = scenario.input.batch.factoryResults.map((result): IsolatedExecution => {
      let calls = 0;
      let resolveFactory: (value: string) => void = NOOP_STRING_RESOLVER;
      const pending = new Promise<string>((resolve) => {
        resolveFactory = resolve;
      });

      return {
        factory: async () => {
          calls += 1;
          return await pending;
        },
        factoryCalls: () => calls,
        guard: IsolatedTrackingGuard.tracked(scenario.input.idempotencyGuard),
        resolve: resolveFactory,
        result
      };
    });

    const results = Promise.all(
      executions.flatMap((execution) =>
        Array.from({ length: scenario.input.batch.callsPerInstance }, () =>
          runScenarioInput(execution.guard, scenario.input, execution.factory)
        )
      )
    );

    assert.deepEqual(
      executions.map((execution) => execution.guard.events),
      [scenario.expected.firstEvents, scenario.expected.secondEvents]
    );
    assert.deepEqual(
      executions.map((execution) => execution.factoryCalls()),
      [0, 0]
    );

    for (const execution of executions) {
      execution.resolve(execution.result);
    }

    assert.deepEqual(await results, scenario.expected.results);
    assert.deepEqual(
      executions.map((execution) => execution.factoryCalls()),
      [scenario.expected.firstFactoryCalls, scenario.expected.secondFactoryCalls]
    );
  },

  'hooks-throwing-replay': async (scenario) => {
    assertScenarioHooksThrowingReplay(scenario);
    class ThrowingReplayGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingReplayGuard {
        return new ThrowingReplayGuard(options);
      }

      protected override onReplay(): void {
        throw RuntimeError.create('onReplay boom');
      }
    }

    const guard = ThrowingReplayGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => scenario.expected.result);
    const result = await runScenarioInput(guard, input, async () => 'wrong');
    assert.equal(result, scenario.expected.result);
  },

  'hooks-throwing-conflict': async (scenario) => {
    assertScenarioHooksThrowingConflict(scenario);
    class ThrowingConflictGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingConflictGuard {
        return new ThrowingConflictGuard(options);
      }

      protected override onConflict(): void {
        throw RuntimeError.create('onConflict boom');
      }
    }

    const guard = ThrowingConflictGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => 'ok');
    await assert.rejects(() => runConflictingScenarioInput(guard, input, async () => 'wrong'), IdempotencyConflictError);
  },

  'hooks-throwing-execute': async (scenario) => {
    assertScenarioHooksThrowingExecute(scenario);
    class ThrowingExecuteGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingExecuteGuard {
        return new ThrowingExecuteGuard(options);
      }

      protected override onExecute(): void {
        throw RuntimeError.create('onExecute boom');
      }
    }

    const guard = ThrowingExecuteGuard.tracked(scenario.input.idempotencyGuard);
    const result = await runScenarioInput(guard, scenario.input, async () => scenario.expected.result);
    assert.equal(result, scenario.expected.result);
  },

  'hooks-sync-replay-swallowed': async (scenario) => {
    assertScenarioHooksSyncReplaySwallowed(scenario);
    class ThrowingReplayGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingReplayGuard {
        return new ThrowingReplayGuard(options);
      }

      protected override onReplay(): void {
        throw RuntimeError.create('onReplay boom (post-HookInvoking-migration)');
      }
    }

    const guard = ThrowingReplayGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => scenario.expected.result);
    const result = await runScenarioInput(guard, input, async () => 'wrong');
    assert.equal(result, scenario.expected.result);
  },

  'hooks-async-replay-safe': async (scenario) => {
    assertScenarioHooksAsyncReplaySafe(scenario);
    const trace = createTraceLogger(scenario.shape);

    class AsyncRejectingReplayGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): AsyncRejectingReplayGuard {
        return new AsyncRejectingReplayGuard(options);
      }

      protected override async onReplay(_key: string): Promise<void> {
        await Promise.resolve();
        throw RuntimeError.create('async onReplay boom');
      }
    }

    const guard = AsyncRejectingReplayGuard.tracked(scenario.input.idempotencyGuard);
    const rejectionEvents: Error[] = [];
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
      trace.log(`unhandled-rejection:${reason.message}`);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const input = scenario.input;
      await runScenarioInput(guard, input, async () => scenario.expected.result);
      const result = await runScenarioInput(guard, input, async () => 'wrong');
      assert.equal(result, scenario.expected.result);
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      assert.equal(rejectionEvents.length, scenario.expected.rejections, trace.snapshot());
      trace.log('replay-settled-without-unhandled-rejection');
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },

  'hooks-throwing-coalesce': async (scenario) => {
    assertScenarioHooksThrowingCoalesce(scenario);
    class ThrowingCoalesceGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingCoalesceGuard {
        return new ThrowingCoalesceGuard(options);
      }

      protected override onCoalesce(): void {
        throw RuntimeError.create('onCoalesce boom');
      }
    }

    const guard = ThrowingCoalesceGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let resolveFactory: (value: string) => void = NOOP_STRING_RESOLVER;
    const pending = new Promise<string>((resolve) => {
      resolveFactory = resolve;
    });
    const factory = async (): Promise<string> => pending;
    const results = runScenarioInputBatch(guard, input, factory);
    resolveFactory(input.batch.factoryResult);
    assert.deepEqual(await results, [scenario.expected.leaderResult, scenario.expected.followerResult]);
  },

  'hooks-async-overrides-safe': async (scenario) => {
    assertScenarioHooksAsyncOverridesSafe(scenario);
    const trace = createTraceLogger(scenario.shape);
    const events: string[] = [];
    const rejectionEvents: Error[] = [];
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
      trace.log(`unhandled-rejection:${reason.message}`);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    class AsyncRejectingHooksGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): AsyncRejectingHooksGuard {
        return new AsyncRejectingHooksGuard(options);
      }

      protected override async onExecute(): Promise<void> {
        events.push('execute');
        await Promise.resolve();
        throw RuntimeError.create('onExecute async boom');
      }

      protected override async onCoalesce(): Promise<void> {
        events.push('coalesce');
        await Promise.resolve();
        throw RuntimeError.create('onCoalesce async boom');
      }

      protected override async onReplay(): Promise<void> {
        events.push('replay');
        await Promise.resolve();
        throw RuntimeError.create('onReplay async boom');
      }

      protected override async onConflict(): Promise<void> {
        events.push('conflict');
        await Promise.resolve();
        throw RuntimeError.create('onConflict async boom');
      }
    }

    const guard = AsyncRejectingHooksGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let resolveFactory: (value: string) => void = NOOP_STRING_RESOLVER;
    const pending = new Promise<string>((resolve) => {
      resolveFactory = resolve;
    });
    const factory = async (): Promise<string> => pending;

    try {
      const results = runScenarioInputBatch(guard, input, factory);
      resolveFactory(input.batch.factoryResult);

      assert.deepEqual(
        await results,
        Array.from({ length: input.batch.calls }, () => scenario.expected.result),
        trace.snapshot()
      );
      assert.equal(await runScenarioInput(guard, input, async () => 'wrong'), scenario.expected.result);
      await assert.rejects(() => runConflictingScenarioInput(guard, input, async () => 'wrong'), IdempotencyConflictError);

      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      trace.log(`events:${events.join(',')}`);
      trace.log(`rejections:${rejectionEvents.length}`);
      assert.deepEqual(events, scenario.expected.events, trace.snapshot());
      assert.equal(rejectionEvents.length, scenario.expected.rejections, trace.snapshot());
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },

  'race-concurrent-different-payload': async (scenario) => {
    assertScenarioRaceConcurrentDifferentPayload(scenario);
    const trace = createTraceLogger(scenario.shape);
    const guard = createGuard<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let leaderCalls = 0;
    let followerCalls = 0;
    let resolveLeader: (value: string) => void = NOOP_STRING_RESOLVER;
    const gate = new Promise<string>((resolve) => {
      resolveLeader = resolve;
    });

    const leaderFactory = async (): Promise<string> => {
      leaderCalls += 1;
      trace.log(`leader-factory:${leaderCalls}`);
      return await gate;
    };

    const followerFactory = async (): Promise<string> => {
      followerCalls += 1;
      trace.log(`follower-factory:${followerCalls}`);
      return input.batch.followerResult;
    };

    const leaderCall = runLeaderScenarioInput(guard, input, leaderFactory);
    const followerCall = runFollowerScenarioInput(guard, input, followerFactory);
    trace.log('racer-scheduled');

    await assert.rejects(async () => {
      await followerCall;
    }, IdempotencyConflictError);

    resolveLeader(input.batch.leaderResult);
    trace.log(`leader-resolved:${input.batch.leaderResult}`);
    const leaderResult = await leaderCall;

    assert.equal(leaderResult, scenario.expected.leaderResult, trace.snapshot());
    assert.equal(leaderCalls, scenario.expected.leaderCalls, trace.snapshot());
    assert.equal(followerCalls, scenario.expected.followerCalls, trace.snapshot());

    let replayFactoryCalls = 0;
    const replayed = await runLeaderScenarioInput(guard, input, async () => {
      replayFactoryCalls += 1;
      return input.batch.replayResult;
    });

    assert.equal(replayed, scenario.expected.replayed, trace.snapshot());
    assert.equal(replayFactoryCalls, scenario.expected.replayFactoryCalls, trace.snapshot());
  }
};

function isScenarioShape(shape: string): shape is ScenarioShape {
  return Object.prototype.hasOwnProperty.call(scenarioRunners, shape);
}

async function runScenario(scenario: ScenarioFixture): Promise<void> {
  if (!isScenarioShape(scenario.shape)) {
    throw RuntimeError.create(`Unknown scenario shape: ${scenario.shape}`);
  }
  await scenarioRunners[scenario.shape](scenario);
}

void describe('idempotency-guard', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runScenario(scenario);
    });
  }
});
