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

import { IdempotencyConflictError, IdempotencyGuard, IdempotencyGuardEntryMetadataEntity } from '../../../src/index.js';

import scenarioGroups from './idempotency-guard.scenarios.json';

type ScenarioFixture = (typeof scenarioGroups.cases)[number];
type ScenarioShape = ScenarioFixture['shape'];
type ScenarioFor<TShape extends ScenarioShape> = Extract<ScenarioFixture, { shape: TShape }>;
type ScenarioRunner<TShape extends ScenarioShape> = (scenario: ScenarioFor<TShape>) => Promise<void> | void;
type ScenarioRunnerMap = { [TShape in ScenarioShape]: ScenarioRunner<TShape> };
type GuardOptions = ScenarioFixture['input']['idempotencyGuard'];
type GuardFactory<TResult> = () => TResult | Promise<TResult>;

type PayloadMaterializerMap = {
  conflicting: <TInput extends { conflictingPayload: unknown }>(input: TInput) => TInput['conflictingPayload'];
  follower: <TInput extends { followerPayload: unknown }>(input: TInput) => TInput['followerPayload'];
  leader: <TInput extends { leaderPayload: unknown }>(input: TInput) => TInput['leaderPayload'];
  primary: <TInput extends { payload: unknown }>(input: TInput) => TInput['payload'];
};
type DiagnosticPatternPredicate = (diagnostic: string) => boolean;

const diagnosticPatternPredicates: Record<string, DiagnosticPatternPredicate> = {
  "Type 'string' is not assignable to type 'number \\| Promise<number>'": (diagnostic) => diagnostic.includes("Type 'string' is not assignable to type 'number | Promise<number>'")
};

class ResultContractCompiler {
  static diagnostics(input: { fixture: string; idempotencyGuard: GuardOptions; key: string; payload: unknown }): string[] {
    const guardOptions = input.idempotencyGuard;
    const fileName = fileURLToPath(new URL(`../../fixtures/${input.fixture}`, import.meta.url));
    const source = `
      import { IdempotencyGuard } from '../../src/index.js';

      const direct = IdempotencyGuard.create<number>({ capacity: ${guardOptions.capacity}, ttlMs: ${guardOptions.ttlMs} });
      await direct.run(${sourceLiteral(scenarioKey(input))}, ${sourceLiteral(scenarioPayload(input))}, () => 'wrong');
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

function sourceLiteral(value: unknown): string {
  const literal = JSON.stringify(value);
  if (literal === undefined) {
    throw new Error('Scenario fixture is not JSON serializable');
  }
  return literal;
}

function scenarioKey(input: { key: string }): string {
  return input.key;
}

const payloadMaterializers: PayloadMaterializerMap = {
  conflicting(input) {
    return structuredClone(input.conflictingPayload);
  },
  follower(input) {
    return structuredClone(input.followerPayload);
  },
  leader(input) {
    return structuredClone(input.leaderPayload);
  },
  primary(input) {
    return structuredClone(input.payload);
  }
};

function scenarioPayload<TInput extends { payload: unknown }>(input: TInput): TInput['payload'] {
  return payloadMaterializers.primary(input);
}

function scenarioConflictingPayload<TInput extends { conflictingPayload: unknown }>(
  input: TInput
): TInput['conflictingPayload'] {
  return payloadMaterializers.conflicting(input);
}

function scenarioLeaderPayload<TInput extends { leaderPayload: unknown }>(input: TInput): TInput['leaderPayload'] {
  return payloadMaterializers.leader(input);
}

function scenarioFollowerPayload<TInput extends { followerPayload: unknown }>(input: TInput): TInput['followerPayload'] {
  return payloadMaterializers.follower(input);
}

function runScenarioInput<TResult, TInput extends { key: string; payload: unknown }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult> {
  return guard.run(scenarioKey(input), scenarioPayload(input), factory);
}

function runConflictingScenarioInput<TResult, TInput extends { conflictingPayload: unknown; key: string }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult> {
  return guard.run(scenarioKey(input), scenarioConflictingPayload(input), factory);
}

function runLeaderScenarioInput<TResult, TInput extends { key: string; leaderPayload: unknown }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult> {
  return guard.run(scenarioKey(input), scenarioLeaderPayload(input), factory);
}

function runFollowerScenarioInput<TResult, TInput extends { followerPayload: unknown; key: string }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult> {
  return guard.run(scenarioKey(input), scenarioFollowerPayload(input), factory);
}

function runScenarioInputBatch<TResult, TInput extends { batch: { calls: number }; key: string; payload: unknown }>(
  guard: IdempotencyGuard<TResult>,
  input: TInput,
  factory: GuardFactory<TResult>
): Promise<TResult[]> {
  return Promise.all(Array.from({ length: input.batch.calls }, () => runScenarioInput(guard, input, factory)));
}

function assertDiagnosticPattern(diagnostic: string, pattern: string): void {
  const predicate = diagnosticPatternPredicates[pattern];

  if (predicate === undefined) {
    throw new Error(`Unsupported diagnostic message pattern scenario: ${pattern}`);
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
    assert.equal(
      IdempotencyGuardEntryMetadataEntity.validate({ fingerprint: scenario.input.fingerprint }),
      scenario.expected.valid
    );
  },

  'metadata-rejects-invalid-fingerprint': (scenario) => {
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
    const trace = createTraceLogger(scenario.shape);
    const guard = createGuard<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let calls = 0;
    let resolveFactory: (value: string) => void = () => {};
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
    const guard = createGuard<number>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    const initial = await runScenarioInput(guard, input, () => scenario.expected.initial);
    const replayed = await runScenarioInput(guard, input, async () => 42);
    assert.equal(initial, scenario.expected.initial);
    assert.equal(replayed, scenario.expected.replayed);
    assert.equal(typeof replayed, scenario.expected.type);
  },

  'result-contract-rejects-invalid-factory': (scenario) => {
    const diagnostics = ResultContractCompiler.diagnostics(scenario.input);
    assert.equal(diagnostics.length, scenario.expected.diagnosticsCount);
    for (const diagnostic of diagnostics) {
      assertDiagnosticPattern(diagnostic, scenario.expected.messagePattern);
    }
  },

  'conflict-same-key-different-payload': async (scenario) => {
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
    const guard = createGuard<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => scenario.expected.result);
    try {
      await runConflictingScenarioInput(guard, input, async () => scenario.expected.result);
      throw new Error('expected IdempotencyConflictError to be thrown');
    } catch (error) {
      if (!(error instanceof IdempotencyConflictError)) {
        throw error;
      }
      assert.equal(error.key, scenario.expected.key);
      assert.equal(error.code, scenario.expected.code);
    }
  },

  'replay-accepts-sync-factory': async (scenario) => {
    const guard = createGuard<{ chargeId: string }>(scenario.input.idempotencyGuard);
    const result = await runScenarioInput(guard, scenario.input, () => structuredClone(scenario.expected.result));
    assert.deepEqual(result, scenario.expected.result);
  },

  'replay-cached-result': async (scenario) => {
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
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => 'ok');
    assert.deepEqual(guard.executed, scenario.expected.executed);
    assert.deepEqual(guard.replayed, scenario.expected.replayed);
    assert.deepEqual(guard.conflicted, scenario.expected.conflicted);
  },

  'hooks-execute-before-factory': async (scenario) => {
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
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => 'ok');
    await runScenarioInput(guard, input, async () => 'ok');
    assert.deepEqual(guard.executed, scenario.expected.executed);
    assert.deepEqual(guard.replayed, scenario.expected.replayed);
  },

  'hooks-conflict-before-throw': async (scenario) => {
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => 'ok');
    await runConflictingScenarioInput(guard, input, async () => 'ok').catch((error: unknown) => {
      if (!(error instanceof IdempotencyConflictError)) {
        throw error;
      }
    });
    assert.deepEqual(guard.conflicted, scenario.expected.conflicted);
  },

  'hooks-coalesce-follower': async (scenario) => {
    const guard = TrackingGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let resolveFactory: (value: string) => void = () => {};
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
      let resolveFactory: (value: string) => void = () => {};
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
    class ThrowingReplayGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingReplayGuard {
        return new ThrowingReplayGuard(options);
      }

      protected override onReplay(): void {
        throw new Error('onReplay boom');
      }
    }

    const guard = ThrowingReplayGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => scenario.expected.result);
    const result = await runScenarioInput(guard, input, async () => 'wrong');
    assert.equal(result, scenario.expected.result);
  },

  'hooks-throwing-conflict': async (scenario) => {
    class ThrowingConflictGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingConflictGuard {
        return new ThrowingConflictGuard(options);
      }

      protected override onConflict(): void {
        throw new Error('onConflict boom');
      }
    }

    const guard = ThrowingConflictGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => 'ok');
    await assert.rejects(() => runConflictingScenarioInput(guard, input, async () => 'wrong'), IdempotencyConflictError);
  },

  'hooks-throwing-execute': async (scenario) => {
    class ThrowingExecuteGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingExecuteGuard {
        return new ThrowingExecuteGuard(options);
      }

      protected override onExecute(): void {
        throw new Error('onExecute boom');
      }
    }

    const guard = ThrowingExecuteGuard.tracked(scenario.input.idempotencyGuard);
    const result = await runScenarioInput(guard, scenario.input, async () => scenario.expected.result);
    assert.equal(result, scenario.expected.result);
  },

  'hooks-sync-replay-swallowed': async (scenario) => {
    class ThrowingReplayGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingReplayGuard {
        return new ThrowingReplayGuard(options);
      }

      protected override onReplay(): void {
        throw new Error('onReplay boom (post-HookInvoking-migration)');
      }
    }

    const guard = ThrowingReplayGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    await runScenarioInput(guard, input, async () => scenario.expected.result);
    const result = await runScenarioInput(guard, input, async () => 'wrong');
    assert.equal(result, scenario.expected.result);
  },

  'hooks-async-replay-safe': async (scenario) => {
    const trace = createTraceLogger(scenario.shape);

    class AsyncRejectingReplayGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): AsyncRejectingReplayGuard {
        return new AsyncRejectingReplayGuard(options);
      }

      protected override async onReplay(_key: string): Promise<void> {
        await Promise.resolve();
        throw new Error('async onReplay boom');
      }
    }

    const guard = AsyncRejectingReplayGuard.tracked(scenario.input.idempotencyGuard);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
      trace.log(`unhandled-rejection:${String((reason as Error | undefined)?.message ?? reason)}`);
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
    class ThrowingCoalesceGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): ThrowingCoalesceGuard {
        return new ThrowingCoalesceGuard(options);
      }

      protected override onCoalesce(): void {
        throw new Error('onCoalesce boom');
      }
    }

    const guard = ThrowingCoalesceGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let resolveFactory: (value: string) => void = () => {};
    const pending = new Promise<string>((resolve) => {
      resolveFactory = resolve;
    });
    const factory = async (): Promise<string> => pending;
    const results = runScenarioInputBatch(guard, input, factory);
    resolveFactory(input.batch.factoryResult);
    assert.deepEqual(await results, [scenario.expected.leaderResult, scenario.expected.followerResult]);
  },

  'hooks-async-overrides-safe': async (scenario) => {
    const trace = createTraceLogger(scenario.shape);
    const events: string[] = [];
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
      trace.log(`unhandled-rejection:${String((reason as Error | undefined)?.message ?? reason)}`);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    class AsyncRejectingHooksGuard extends IdempotencyGuard<string> {
      static tracked(options: GuardOptions): AsyncRejectingHooksGuard {
        return new AsyncRejectingHooksGuard(options);
      }

      protected override async onExecute(): Promise<void> {
        events.push('execute');
        await Promise.resolve();
        throw new Error('onExecute async boom');
      }

      protected override async onCoalesce(): Promise<void> {
        events.push('coalesce');
        await Promise.resolve();
        throw new Error('onCoalesce async boom');
      }

      protected override async onReplay(): Promise<void> {
        events.push('replay');
        await Promise.resolve();
        throw new Error('onReplay async boom');
      }

      protected override async onConflict(): Promise<void> {
        events.push('conflict');
        await Promise.resolve();
        throw new Error('onConflict async boom');
      }
    }

    const guard = AsyncRejectingHooksGuard.tracked(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let resolveFactory: (value: string) => void = () => {};
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
    const trace = createTraceLogger(scenario.shape);
    const guard = createGuard<string>(scenario.input.idempotencyGuard);
    const input = scenario.input;
    let leaderCalls = 0;
    let followerCalls = 0;
    let resolveLeader: (value: string) => void = () => {};
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

async function runScenario<TShape extends ScenarioShape>(scenario: ScenarioFor<TShape>): Promise<void> {
  await scenarioRunners[scenario.shape](scenario);
}

void describe('idempotency-guard', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runScenario(scenario);
    });
  }
});
