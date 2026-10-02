import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
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

import type { IdempotencyGuardOptionsEntity } from '../../../src/entities/index.js';

import { IdempotencyGuardEntryMetadataEntity, IdempotencyPayloadEntity } from '../../../src/entities/index.js';
import { IdempotencyConflictError, IdempotencyGuard } from '../../../src/index.js';
import { IdempotencyGuardScenarioCaseEntity } from '../entities/IdempotencyGuardScenarioCaseEntity.js';
import scenarioGroups from './idempotency-guard.scenarios.json' with { 'type': 'json' };

class IdempotencyFixtureError extends BaseError {
  public override readonly name: string = 'IdempotencyFixtureError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'idempotencyGuard.testFixtureFailed',
      'message': message,
      'retryable': false
    });
  }
}

interface GuardFactoryInterface<TResult> {
  (): TResult | Promise<TResult>;
}

/** Records labelled lines for a scenario; the snapshot annotates assertion failures. */
class TraceLogger {
  readonly #lines: string[] = [];
  readonly #shape: string;

  constructor(shape: string) {
    this.#shape = shape;
  }

  log(message: string): void {
    const line = `${this.#shape}: ${message}`;
    this.#lines.push(line);
    if (process.env.SUBSTATE_TEST_TRACE === '1') {
      process.stderr.write(`${line}\n`);
    }
  }

  snapshot(): string {
    const text = this.#lines.join('\n');
    return text;
  }
}

/** Collects `unhandledRejection` reasons while a scenario runs. */
class RejectionRecorder {
  readonly reasons: unknown[] = [];
  readonly #listener: (reason: unknown) => void;

  constructor(trace: TraceLogger) {
    this.#listener = (reason): void => {
      this.reasons.push(reason);
      trace.log(`unhandled-rejection:${String(reason)}`);
    };
    process.on('unhandledRejection', this.#listener);
  }

  dispose(): void {
    process.off('unhandledRejection', this.#listener);
  }
}

/** A guard whose lifecycle hooks record the keys they fire for. */
class TrackingGuard extends IdempotencyGuard<string> {
  readonly replayed: string[] = [];
  readonly coalesced: string[] = [];
  readonly conflicted: string[] = [];
  readonly executed: string[] = [];

  static tracked(options: IdempotencyGuardOptionsEntity.InputType): TrackingGuard {
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

/** A guard that records each `onExecute` and `onCoalesce` firing in order. */
class IsolatedTrackingGuard extends IdempotencyGuard<string> {
  readonly events: string[] = [];

  static tracked(options: IdempotencyGuardOptionsEntity.InputType): IsolatedTrackingGuard {
    return new IsolatedTrackingGuard(options);
  }

  protected override onExecute(key: string): void {
    this.events.push(`execute:${key}`);
  }

  protected override onCoalesce(key: string): void {
    this.events.push(`coalesce:${key}`);
  }
}

/** A guard whose named hook throws a synchronous named error. */
class ThrowingHookGuard extends IdempotencyGuard<string> {
  readonly #hookName: string;

  constructor(options: IdempotencyGuardOptionsEntity.InputType, hookName: string) {
    super(options);
    this.#hookName = hookName;
  }

  static throwing(options: IdempotencyGuardOptionsEntity.InputType, hookName: string): ThrowingHookGuard {
    return new ThrowingHookGuard(options, hookName);
  }

  protected override onConflict(): void {
    this.failWhen('onConflict');
  }

  protected override onCoalesce(): void {
    this.failWhen('onCoalesce');
  }

  protected override onExecute(): void {
    this.failWhen('onExecute');
  }

  protected override onReplay(): void {
    this.failWhen('onReplay');
  }

  private failWhen(hookName: string): void {
    if (this.#hookName === hookName) {
      throw RuntimeError.create(`${hookName} boom`);
    }
  }
}

/** A guard that appends `execute` to a shared event list before its factory runs. */
class OrderedGuard extends IdempotencyGuard<string> {
  readonly #events: string[];

  constructor(options: IdempotencyGuardOptionsEntity.InputType, events: string[]) {
    super(options);
    this.#events = events;
  }

  static ordered(options: IdempotencyGuardOptionsEntity.InputType, events: string[]): OrderedGuard {
    return new OrderedGuard(options, events);
  }

  protected override onExecute(): void {
    this.#events.push('execute');
  }
}

/** One isolated guard instance with a gated factory whose invocations are counted. */
class IsolatedExecution {
  readonly guard: IsolatedTrackingGuard;
  readonly result: string;
  readonly #gate: PromiseWithResolvers<string> = Promise.withResolvers<string>();
  #calls = 0;

  constructor(guard: IsolatedTrackingGuard, result: string) {
    this.guard = guard;
    this.result = result;
  }

  get factoryCalls(): number {
    return this.#calls;
  }

  factory(): Promise<string> {
    this.#calls += 1;
    return this.#gate.promise;
  }

  release(): void {
    this.#gate.resolve(this.result);
  }
}

class ResultContractCompiler {
  static diagnostics(input: { 'fixture': string; 'idempotencyGuard': IdempotencyGuardOptionsEntity.InputType; 'key': string; 'payload': IdempotencyPayloadEntity.Type }): string[] {
    const guardOptions = input.idempotencyGuard;
    const fileName = ResultContractCompiler.fixturePath(input.fixture);
    const source = `
      import { IdempotencyGuard } from '../../src/index.js';
      import { IdempotencyPayloadEntity } from '../../src/entities/index.js';

      const direct = IdempotencyGuard.create<number>({ capacity: ${guardOptions.capacity}, ttlMs: ${guardOptions.ttlMs} });
      await direct.run(${ResultContractCompiler.literal(input.key)}, IdempotencyPayloadEntity.create(${ResultContractCompiler.literal(input.payload)}), () => 'wrong');
    `;
    const options = {
      'module': ModuleKind.NodeNext,
      'moduleResolution': ModuleResolutionKind.NodeNext,
      'noEmit': true,
      'skipLibCheck': true,
      'strict': true,
      'target': ScriptTarget.ES2022
    };
    const baseHost = createCompilerHost(options);
    const host = createCompilerHost(options);

    host.fileExists = (candidate): boolean => {
      const exists = candidate === fileName || baseHost.fileExists(candidate);
      return exists;
    };
    host.readFile = (candidate): string | undefined => {
      const contents = candidate === fileName ? source : baseHost.readFile(candidate);
      return contents;
    };
    host.getSourceFile = (candidate, languageVersion, onError, shouldCreateNewSourceFile) => {
      let sourceFile = baseHost.getSourceFile(candidate, languageVersion, onError, shouldCreateNewSourceFile);
      if (candidate === fileName) {
        sourceFile = createSourceFile(candidate, source, languageVersion, true);
      }
      return sourceFile;
    };

    const program = createProgram([fileName], options, host);
    const messages: string[] = [];
    const diagnostics = getPreEmitDiagnostics(program);
    for (let index = 0; index < diagnostics.length; index += 1) {
      const diagnostic = diagnostics[index];
      if (diagnostic?.file?.fileName === fileName && diagnostic.code === 2322) {
        messages.push(flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    }
    return messages;
  }

  private static fixturePath(fixture: string): string {
    try {
      const path = fileURLToPath(new URL(`../../fixtures/${fixture}`, import.meta.url));
      return path;
    } catch (cause) {
      throw new IdempotencyFixtureError('Fixture path did not resolve', cause);
    }
  }

  private static literal(value: IdempotencyPayloadEntity.Type | string): string {
    try {
      const text = JSON.stringify(value);
      return text;
    } catch (cause) {
      throw new IdempotencyFixtureError('Scenario fixture is not JSON serializable', cause);
    }
  }
}

class IdempotencyGuardRunners {
  static async 'coalesce-shares-one-execution'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'coalesce-shares-one-execution'>): Promise<void> {
    const trace = new TraceLogger(scenario.shape);
    const guard = IdempotencyGuard.create<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;
    const gate = Promise.withResolvers<string>();
    const factory = async (): Promise<string> => {
      calls += 1;
      trace.log(`factory-call:${calls}`);
      return await gate.promise;
    };

    const results = IdempotencyGuardRunners.runBatch(guard, input, factory);
    trace.log('leader-and-follower-scheduled');
    gate.resolve(input.batch.factoryResult);
    trace.log(`factory-resolved:${input.batch.factoryResult}`);

    const output = await results;
    assert.equal(calls, scenario.expected.calls, trace.snapshot());
    assert.deepEqual(
      output,
      IdempotencyGuardRunners.repeat(input.batch.calls, scenario.expected.result),
      trace.snapshot()
    );
  }

  static async 'conflict-exposes-key'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'conflict-exposes-key'>): Promise<void> {
    const guard = IdempotencyGuard.create<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await IdempotencyGuardRunners.runPrimary(guard, input, async () => {
      return await Promise.resolve(scenario.expected.result);
    });
    await assert.rejects(
      IdempotencyGuardRunners.runConflicting(guard, input, async () => {
        return await Promise.resolve(scenario.expected.result);
      }),
      (thrown) => {
        const error: unknown = thrown;
        assert.ok(error instanceof IdempotencyConflictError);
        assert.equal(error.key, scenario.expected.key);
        assert.equal(error.code, scenario.expected.code);
        return true;
      }
    );
  }

  static async 'conflict-same-key-different-payload'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'conflict-same-key-different-payload'>): Promise<void> {
    const guard = IdempotencyGuard.create<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;

    await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      calls += 1;
      return 'ok';
    });

    await assert.rejects(
      IdempotencyGuardRunners.runConflicting(guard, input, () => {
        calls += 1;
        return 'ok';
      }),
      IdempotencyConflictError
    );

    assert.equal(calls, scenario.expected.calls);
  }

  static async 'hooks-async-overrides-safe'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-async-overrides-safe'>): Promise<void> {
    const trace = new TraceLogger(scenario.shape);
    const events: string[] = [];
    const recorder = new RejectionRecorder(trace);
    const guard = IdempotencyGuard.create<string>(scenario.input.idempotencyGuard);
    Object.assign(guard, { 'onExecute': IdempotencyGuardRunners.asyncFailureHook('onExecute', 'execute', events) });
    Object.assign(guard, { 'onCoalesce': IdempotencyGuardRunners.asyncFailureHook('onCoalesce', 'coalesce', events) });
    Object.assign(guard, { 'onReplay': IdempotencyGuardRunners.asyncFailureHook('onReplay', 'replay', events) });
    Object.assign(guard, { 'onConflict': IdempotencyGuardRunners.asyncFailureHook('onConflict', 'conflict', events) });
    const input = scenario.input;
    const gate = Promise.withResolvers<string>();

    try {
      const results = IdempotencyGuardRunners.runBatch(guard, input, () => {
        return gate.promise;
      });
      gate.resolve(input.batch.factoryResult);

      assert.deepEqual(
        await results,
        IdempotencyGuardRunners.repeat(input.batch.calls, scenario.expected.result),
        trace.snapshot()
      );
      assert.equal(await IdempotencyGuardRunners.runPrimary(guard, input, () => {
        return 'wrong';
      }), scenario.expected.result);
      await assert.rejects(IdempotencyGuardRunners.runConflicting(guard, input, () => {
        return 'wrong';
      }), IdempotencyConflictError);

      await IdempotencyGuardRunners.flushImmediate();
      await IdempotencyGuardRunners.flushImmediate();

      trace.log(`events:${events.join(',')}`);
      trace.log(`rejections:${recorder.reasons.length}`);
      assert.deepEqual(events, scenario.expected.events, trace.snapshot());
      assert.equal(recorder.reasons.length, scenario.expected.rejections, trace.snapshot());
    } finally {
      recorder.dispose();
    }
  }

  static async 'hooks-async-replay-safe'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-async-replay-safe'>): Promise<void> {
    const trace = new TraceLogger(scenario.shape);
    const guard = IdempotencyGuard.create<string>(scenario.input.idempotencyGuard);
    Object.assign(guard, { 'onReplay': IdempotencyGuardRunners.asyncFailureHook('onReplay', 'replay', []) });
    const recorder = new RejectionRecorder(trace);
    try {
      const input = scenario.input;
      await IdempotencyGuardRunners.runPrimary(guard, input, () => {
        return scenario.expected.result;
      });
      const result = await IdempotencyGuardRunners.runPrimary(guard, input, () => {
        return 'wrong';
      });
      assert.equal(result, scenario.expected.result);
      await IdempotencyGuardRunners.flushImmediate();
      await IdempotencyGuardRunners.flushImmediate();
      assert.equal(recorder.reasons.length, scenario.expected.rejections, trace.snapshot());
      trace.log('replay-settled-without-unhandled-rejection');
    } finally {
      recorder.dispose();
    }
  }

  static async 'hooks-coalesce-follower'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-coalesce-follower'>): Promise<void> {
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    const gate = Promise.withResolvers<string>();
    const results = IdempotencyGuardRunners.runBatch(guard, input, () => {
      return gate.promise;
    });
    gate.resolve(input.batch.factoryResult);
    await results;
    assert.deepEqual(guard.executed, scenario.expected.executed);
    assert.deepEqual(guard.coalesced, scenario.expected.coalesced);
  }

  static async 'hooks-conflict-before-throw'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-conflict-before-throw'>): Promise<void> {
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return 'ok';
    });
    await assert.rejects(IdempotencyGuardRunners.runConflicting(guard, input, () => {
      return 'ok';
    }), IdempotencyConflictError);
    assert.deepEqual(guard.conflicted, scenario.expected.conflicted);
  }

  static async 'hooks-execute-before-factory'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-execute-before-factory'>): Promise<void> {
    const events: string[] = [];
    const guard = OrderedGuard.ordered(scenario.input.idempotencyGuard, events);
    await IdempotencyGuardRunners.runPrimary(guard, scenario.input, () => {
      events.push('factory');
      return 'ok';
    });
    assert.deepEqual(events, scenario.expected.events);
  }

  static async 'hooks-execute-new-key'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-execute-new-key'>): Promise<void> {
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    await IdempotencyGuardRunners.runPrimary(guard, scenario.input, () => {
      return 'ok';
    });
    assert.deepEqual(guard.executed, scenario.expected.executed);
    assert.deepEqual(guard.replayed, scenario.expected.replayed);
    assert.deepEqual(guard.conflicted, scenario.expected.conflicted);
  }

  static async 'hooks-isolated-instances'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-isolated-instances'>): Promise<void> {
    const factoryResults = scenario.input.batch.factoryResults;
    const executions: IsolatedExecution[] = [];
    for (let index = 0; index < factoryResults.length; index += 1) {
      executions.push(new IsolatedExecution(IsolatedTrackingGuard.tracked(scenario.input.idempotencyGuard), String(factoryResults[index])));
    }

    const pendingRuns: Promise<string>[] = [];
    for (let index = 0; index < executions.length; index += 1) {
      const execution = executions[index];
      assert.ok(execution !== undefined);
      for (let call = 0; call < scenario.input.batch.callsPerInstance; call += 1) {
        pendingRuns.push(IdempotencyGuardRunners.runPrimary(execution.guard, scenario.input, () => {
          const pending = execution.factory();
          return pending;
        }));
      }
    }
    const results = Promise.all(pendingRuns);

    assert.deepEqual(
      IdempotencyGuardRunners.eventsOf(executions),
      [scenario.expected.firstEvents, scenario.expected.secondEvents]
    );
    assert.deepEqual(
      IdempotencyGuardRunners.factoryCallsOf(executions),
      [0, 0]
    );

    for (let index = 0; index < executions.length; index += 1) {
      executions[index]?.release();
    }

    assert.deepEqual(await results, scenario.expected.results);
    assert.deepEqual(
      IdempotencyGuardRunners.factoryCallsOf(executions),
      [scenario.expected.firstFactoryCalls, scenario.expected.secondFactoryCalls]
    );
  }

  static async 'hooks-replay-match'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-replay-match'>): Promise<void> {
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return 'ok';
    });
    await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return 'ok';
    });
    assert.deepEqual(guard.executed, scenario.expected.executed);
    assert.deepEqual(guard.replayed, scenario.expected.replayed);
  }

  static async 'hooks-sync-replay-swallowed'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-sync-replay-swallowed'>): Promise<void> {
    const guard = ThrowingHookGuard.throwing(scenario.input.idempotencyGuard, 'onReplay');
    const input = scenario.input;
    await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return scenario.expected.result;
    });
    const result = await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return 'wrong';
    });
    assert.equal(result, scenario.expected.result);
  }

  static async 'hooks-throwing-coalesce'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-throwing-coalesce'>): Promise<void> {
    const guard = ThrowingHookGuard.throwing(scenario.input.idempotencyGuard, 'onCoalesce');
    const input = scenario.input;
    const gate = Promise.withResolvers<string>();
    const results = IdempotencyGuardRunners.runBatch(guard, input, () => {
      return gate.promise;
    });
    gate.resolve(input.batch.factoryResult);
    assert.deepEqual(await results, [scenario.expected.leaderResult, scenario.expected.followerResult]);
  }

  static async 'hooks-throwing-conflict'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-throwing-conflict'>): Promise<void> {
    const guard = ThrowingHookGuard.throwing(scenario.input.idempotencyGuard, 'onConflict');
    const input = scenario.input;
    await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return 'ok';
    });
    await assert.rejects(IdempotencyGuardRunners.runConflicting(guard, input, () => {
      return 'wrong';
    }), IdempotencyConflictError);
  }

  static async 'hooks-throwing-execute'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-throwing-execute'>): Promise<void> {
    const guard = ThrowingHookGuard.throwing(scenario.input.idempotencyGuard, 'onExecute');
    const result = await IdempotencyGuardRunners.runPrimary(guard, scenario.input, () => {
      return scenario.expected.result;
    });
    assert.equal(result, scenario.expected.result);
  }

  static async 'hooks-throwing-replay'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'hooks-throwing-replay'>): Promise<void> {
    const guard = ThrowingHookGuard.throwing(scenario.input.idempotencyGuard, 'onReplay');
    const input = scenario.input;
    await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return scenario.expected.result;
    });
    const result = await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return 'wrong';
    });
    assert.equal(result, scenario.expected.result);
  }

  static 'metadata-accepts-string-fingerprint'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'metadata-accepts-string-fingerprint'>): void {
    assert.equal(
      IdempotencyGuardEntryMetadataEntity.validate({ 'fingerprint': scenario.input.fingerprint }),
      scenario.expected.valid
    );
  }

  static 'metadata-rejects-invalid-fingerprint'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'metadata-rejects-invalid-fingerprint'>): void {
    assert.equal(
      IdempotencyGuardEntryMetadataEntity.validate(scenario.input.missingFingerprint),
      scenario.expected.missingValid
    );
    assert.equal(
      IdempotencyGuardEntryMetadataEntity.validate(scenario.input.numericFingerprint),
      scenario.expected.numericValid
    );
  }

  static async 'race-concurrent-different-payload'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'race-concurrent-different-payload'>): Promise<void> {
    const trace = new TraceLogger(scenario.shape);
    const guard = IdempotencyGuard.create<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let leaderCalls = 0;
    let followerCalls = 0;
    const gate = Promise.withResolvers<string>();

    const leaderFactory = async (): Promise<string> => {
      leaderCalls += 1;
      trace.log(`leader-factory:${leaderCalls}`);
      return await gate.promise;
    };

    const followerFactory = (): string => {
      followerCalls += 1;
      trace.log(`follower-factory:${followerCalls}`);
      return input.batch.followerResult;
    };

    const leaderCall = guard.run(input.key, IdempotencyGuardRunners.materialize(input.leaderPayload), leaderFactory);
    const followerCall = guard.run(input.key, IdempotencyGuardRunners.materialize(input.followerPayload), followerFactory);
    trace.log('racer-scheduled');

    await assert.rejects(followerCall, IdempotencyConflictError);

    gate.resolve(input.batch.leaderResult);
    trace.log(`leader-resolved:${input.batch.leaderResult}`);
    const leaderResult = await leaderCall;

    assert.equal(leaderResult, scenario.expected.leaderResult, trace.snapshot());
    assert.equal(leaderCalls, scenario.expected.leaderCalls, trace.snapshot());
    assert.equal(followerCalls, scenario.expected.followerCalls, trace.snapshot());

    let replayFactoryCalls = 0;
    const replayed = await guard.run(input.key, IdempotencyGuardRunners.materialize(input.leaderPayload), () => {
      replayFactoryCalls += 1;
      return input.batch.replayResult;
    });

    assert.equal(replayed, scenario.expected.replayed, trace.snapshot());
    assert.equal(replayFactoryCalls, scenario.expected.replayFactoryCalls, trace.snapshot());
  }

  static async 'replay-accepts-sync-factory'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'replay-accepts-sync-factory'>): Promise<void> {
    const guard = IdempotencyGuard.create<{ 'chargeId': string }>(scenario.input.idempotencyGuard);
    const result = await IdempotencyGuardRunners.runPrimary(guard, scenario.input, () => {
      const copy = IdempotencyGuardRunners.cloneFixture(scenario.expected.result);
      return copy;
    });
    assert.deepEqual(result, scenario.expected.result);
  }

  static async 'replay-cached-result'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'replay-cached-result'>): Promise<void> {
    const guard = IdempotencyGuard.create<{ 'chargeId': string }>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;
    const first = await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      calls += 1;
      const copy = IdempotencyGuardRunners.cloneFixture(scenario.expected.firstResult);
      return copy;
    });
    const second = await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      calls += 1;
      const copy = IdempotencyGuardRunners.cloneFixture(scenario.expected.secondResult);
      return copy;
    });
    assert.equal(calls, scenario.expected.calls);
    assert.deepEqual(first, scenario.expected.firstResult);
    assert.deepEqual(second, scenario.expected.firstResult);
  }

  static async 'replay-expired-entry-reruns'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'replay-expired-entry-reruns'>): Promise<void> {
    const guard = IdempotencyGuard.create<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;
    await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      calls += 1;
      return 'first';
    });
    await IdempotencyGuardRunners.waitMs(input.expirationWaitMs);
    const second = await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      calls += 1;
      return scenario.expected.second;
    });
    assert.equal(calls, scenario.expected.calls);
    assert.equal(second, scenario.expected.second);
  }

  static async 'result-contract-owned'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'result-contract-owned'>): Promise<void> {
    const guard = IdempotencyGuard.create<number>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    const initial = await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return scenario.expected.initial;
    });
    const replayed = await IdempotencyGuardRunners.runPrimary(guard, input, () => {
      return 42;
    });
    assert.equal(initial, scenario.expected.initial);
    assert.equal(replayed, scenario.expected.replayed);
    assert.equal(typeof replayed, scenario.expected.type);
  }

  static 'result-contract-rejects-invalid-factory'(scenario: ScenarioCaseOfType<IdempotencyGuardScenarioCaseEntity.Type, 'result-contract-rejects-invalid-factory'>): void {
    const diagnostics = ResultContractCompiler.diagnostics({
      'fixture': scenario.input.fixture,
      'idempotencyGuard': scenario.input.idempotencyGuard,
      'key': scenario.input.key,
      'payload': IdempotencyGuardRunners.materialize(scenario.input.payload)
    });
    assert.equal(diagnostics.length, scenario.expected.diagnosticsCount);
    for (let index = 0; index < diagnostics.length; index += 1) {
      IdempotencyGuardRunners.assertDiagnosticPattern(String(diagnostics[index]), scenario.expected.messagePattern);
    }
  }

  private static assertDiagnosticPattern(diagnostic: string, pattern: string): void {
    assert.equal(pattern, "Type 'string' is not assignable to type 'number \\| Promise<number>'", `Unsupported diagnostic message pattern scenario: ${pattern}`);
    assert.equal(diagnostic.includes("Type 'string' is not assignable to type 'number | Promise<number>'"), true);
  }

  private static cloneFixture(value: { 'chargeId': string }): { 'chargeId': string } {
    try {
      const copy = structuredClone(value);
      return copy;
    } catch (cause) {
      throw new IdempotencyFixtureError('Scenario fixture is not cloneable', cause);
    }
  }

  private static eventsOf(executions: readonly IsolatedExecution[]): (readonly string[])[] {
    const events: (readonly string[])[] = [];
    for (let index = 0; index < executions.length; index += 1) {
      events.push(executions[index]?.guard.events ?? []);
    }
    return events;
  }

  private static factoryCallsOf(executions: readonly IsolatedExecution[]): number[] {
    const calls: number[] = [];
    for (let index = 0; index < executions.length; index += 1) {
      calls.push(executions[index]?.factoryCalls ?? -1);
    }
    return calls;
  }

  private static flushImmediate(): Promise<void> {
    const flushed = new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    return flushed;
  }

  /** A lifecycle hook that records `label` and rejects asynchronously; installed on an instance in place of the synchronous hook. */
  private static asyncFailureHook(hookName: string, label: string, events: string[]): () => Promise<void> {
    const hook = (): Promise<void> => {
      events.push(label);
      const pending = IdempotencyGuardRunners.rejectAfterTick(`${hookName} async boom`);
      return pending;
    };
    return hook;
  }

  private static materialize(payload: IdempotencyPayloadEntity.Type): IdempotencyPayloadEntity.Type {
    try {
      const copy = IdempotencyPayloadEntity.create(structuredClone(payload));
      return copy;
    } catch (cause) {
      throw new IdempotencyFixtureError('Scenario payload is not cloneable', cause);
    }
  }

  private static async rejectAfterTick(message: string): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create(message);
  }

  private static repeat(count: number, value: string): string[] {
    const values: string[] = [];
    for (let index = 0; index < count; index += 1) {
      values.push(value);
    }
    return values;
  }

  private static runBatch<TResult>(
    guard: IdempotencyGuard<TResult>,
    input: { 'batch': { 'calls': number }; 'key': string; 'payload': IdempotencyPayloadEntity.Type },
    factory: GuardFactoryInterface<TResult>
  ): Promise<TResult[]> {
    const runs: Promise<TResult>[] = [];
    for (let index = 0; index < input.batch.calls; index += 1) {
      runs.push(IdempotencyGuardRunners.runPrimary(guard, input, factory));
    }
    const results = Promise.all(runs);
    return results;
  }

  private static runConflicting<TResult>(
    guard: IdempotencyGuard<TResult>,
    input: { 'conflictingPayload': IdempotencyPayloadEntity.Type; 'key': string },
    factory: GuardFactoryInterface<TResult>
  ): Promise<TResult> {
    const result = guard.run(input.key, IdempotencyGuardRunners.materialize(input.conflictingPayload), factory);
    return result;
  }

  private static runPrimary<TResult>(
    guard: IdempotencyGuard<TResult>,
    input: { 'key': string; 'payload': IdempotencyPayloadEntity.Type },
    factory: GuardFactoryInterface<TResult>
  ): Promise<TResult> {
    const result = guard.run(input.key, IdempotencyGuardRunners.materialize(input.payload), factory);
    return result;
  }

  private static waitMs(milliseconds: number): Promise<void> {
    const waited = new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
    return waited;
  }
}

ScenarioSuite.register({
  'entity': IdempotencyGuardScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'idempotency-guard',
  'runners': IdempotencyGuardRunners
});
