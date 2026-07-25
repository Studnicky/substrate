import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import type {
  PaginatorAvailableCursorInterface,
  PaginatorExhaustedCursorEntity,
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorIdleStateEntity,
  PaginatorPageReceivedEventInterface,
  PaginatorResetEventEntity
} from '../../../src/index.js';

import { Paginator } from '../../../src/index.js';

type ScenarioKind =
  | 'accumulation-many-pages'
  | 'accumulation-multiple-pages'
  | 'accumulation-nested-pages-detached'
  | 'accumulation-pages-defensive-snapshot'
  | 'accumulation-single-page'
  | 'creation-has-next'
  | 'creation-pages-empty'
  | 'discriminant-narrowing'
  | 'exhaustion-after-exhaustion-throws'
  | 'exhaustion-first-page'
  | 'exhaustion-later-page'
  | 'exhaustion-undefined-cursor'
  | 'hook-error-async-rejection'
  | 'hook-error-owning-instance-isolation'
  | 'hook-error-throwing-enter'
  | 'hooks-record-exhausted-reset'
  | 'hooks-record-transitions'
  | 'hooks-rejected-after-exhaustion'
  | 'hooks-retain-detached-cursor-snapshot'
  | 'hooks-skip-hasmore-self-transition'
  | 'reentrancy-cross-instance'
  | 'reentrancy-next'
  | 'reentrancy-reset';

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: { paginator: Record<string, unknown> };
  kind: ScenarioKind;
  name: string;
};

import scenarioGroups from './paginator.scenarios.json' with { type: 'json' };

interface TransitionRecord {
  from: string;
  to: string;
  event: string;
}

interface ObjectCursor {
  token: {
    value: string;
  };
}

type PaginatorState =
  | PaginatorIdleStateEntity.Type
  | PaginatorHasMoreStateInterface<string, number>
  | PaginatorExhaustedStateInterface<string>;

class TrackingPaginator extends Paginator<string, number> {
  readonly transitions: TransitionRecord[] = [];
  readonly enters: string[] = [];
  readonly exits: string[] = [];
  readonly order: string[] = [];
  readonly rejections: { event: string; reason: string; state: string }[] = [];

  protected override onTransition(
    from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
  ): void {
    this.transitions.push({ 'event': event.type, 'from': from.variant, 'to': to.variant });
    this.order.push(`transition:${from.variant}->${to.variant}`);
  }

  protected override onEnterState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.enters.push(state.variant);
    this.order.push(`enter:${state.variant}`);
  }

  protected override onExitState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.exits.push(state.variant);
    this.order.push(`exit:${state.variant}`);
  }

  protected override onTransitionRejected(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>,
    reason: string
  ): void {
    this.rejections.push({ 'event': event.type, reason, 'state': state.variant });
    this.order.push(`rejected:${state.variant}:${event.type}`);
  }
}

class CursorSnapshotPaginator extends Paginator<string, ObjectCursor> {
  readonly exitedCursorValues: string[] = [];

  protected override onExitState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, ObjectCursor>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    if (state.variant === 'hasMore') {
      this.exitedCursorValues.push(state.cursor.token.value);
    }
  }
}

class ThrowingOnEnterPaginator extends Paginator<string, number> {
  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    throw new Error('onEnterState boom');
  }
}

class AsyncOverridePaginator extends Paginator<string, number> {
  protected override async onTransition(
    _from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    _to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    _event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
  ): Promise<void> {
    throw new Error('onTransition async boom');
  }
}

class AsyncOwnedPaginator extends Paginator<string, number> {
  readonly failureDetails = { 'labels': ['initial'] };
  failure = new Error('unconfigured transition failure');
  readonly transitions: string[] = [];
  private name = 'unconfigured';
  private rejectNextTransition = false;

  configure(name: string, rejectNextTransition: boolean): void {
    this.name = name;
    this.failure = new Error(`${name} transition boom`, { 'cause': this.failureDetails });
    this.rejectNextTransition = rejectNextTransition;
  }

  diagnostics(): readonly HookInvocationError[] {
    return this.hooks.getHookErrors();
  }

  protected override async onTransition(
    _from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    _event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
  ): Promise<void> {
    this.transitions.push(`${this.name}:${to.variant}`);

    if (this.rejectNextTransition) {
      this.rejectNextTransition = false;
      await Promise.resolve();
      throw this.failure;
    }
  }
}

class ReentrantNextPaginator extends Paginator<string, number> {
  private reentered = false;

  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    if (this.reentered) {
      return;
    }
    this.reentered = true;
    this.next('page-2', { 'cursor': 3, 'exhausted': false });
  }
}

class ReentrantResetPaginator extends Paginator<string, number> {
  enterCount = 0;
  private reentered = false;

  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.enterCount += 1;

    if (this.reentered) {
      return;
    }
    this.reentered = true;
    this.reset();
  }
}

class CrossInstanceReentrantPaginator extends Paginator<string, number> {
  readonly enters: string[] = [];
  private name = 'unconfigured';
  private reentered = false;
  private target: CrossInstanceReentrantPaginator | undefined;

  configure(name: string, target?: CrossInstanceReentrantPaginator): void {
    this.name = name;
    this.target = target;
  }

  protected override onEnterState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.enters.push(`${this.name}:${state.variant}`);

    if (!this.reentered && this.target !== undefined) {
      this.reentered = true;
      this.target.next(`${this.name}-delegated-page`, { 'cursor': 2, 'exhausted': false });
    }
  }
}

function describeCursor(
  cursor: PaginatorAvailableCursorInterface<number> | PaginatorExhaustedCursorEntity.Type
): string {
  return cursor.exhausted ? 'exhausted' : `cursor:${String(cursor.cursor)}`;
}

function describeEvent(
  event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
): string {
  if (event.type === 'reset') {
    return event.type;
  }

  return `${event.page}:${describeCursor(event.nextCursor)}`;
}

const stateDescriptionMap: Record<PaginatorState['variant'], (state: PaginatorState) => string> = {
  exhausted: (state) => {
    assert.equal(state.variant, 'exhausted');
    return `${state.pages.join(',')}:exhausted`;
  },
  hasMore: (state) => {
    assert.equal(state.variant, 'hasMore');
    return `${state.pages.join(',')}:cursor:${String(state.cursor)}`;
  },
  idle: (state) => {
    assert.equal(state.variant, 'idle');
    return state.variant;
  }
};

function describeState(
  state: PaginatorState
): string {
  return stateDescriptionMap[state.variant](state);
}

function recordField(input: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = input[key];
  assert.notEqual(value, null);
  assert.equal(typeof value, 'object');
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function arrayField(input: Record<string, unknown>, key: string): unknown[] {
  const value = input[key];
  assert.ok(Array.isArray(value));
  return value;
}

function stringField(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected string field ${key}`);
  }
  return value;
}

function numberField(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  if (typeof value !== 'number') {
    throw new Error(`Expected number field ${key}`);
  }
  return value;
}

function falseField(input: Record<string, unknown>, key: string): false {
  const value = input[key];
  assert.equal(value, false);
  return value;
}

function itemAt<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Expected item at index ${String(index)}`);
  }
  return value;
}

function cursorFrom<TCursor>(
  value: unknown
): PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type {
  const cursor = value as { cursor?: unknown; exhausted: boolean };
  if (cursor.exhausted) {
    return { 'exhausted': true };
  }

  const normalizedCursor = cursor.cursor !== null
    && typeof cursor.cursor === 'object'
    && Reflect.get(cursor.cursor, 'kind') === 'undefined'
    ? undefined
    : cursor.cursor;

  return { 'cursor': normalizedCursor as TCursor, 'exhausted': false };
}

function objectCursorFrom(input: Record<string, unknown>): ObjectCursor {
  return { 'token': { 'value': stringField(recordField(input, 'token'), 'value') } };
}

function objectCursorNextCursorFrom(
  cursor: ObjectCursor,
  input: Record<string, unknown>
): PaginatorAvailableCursorInterface<ObjectCursor> {
  return { cursor, 'exhausted': falseField(input, 'exhausted') };
}

function applyPages<TPage, TCursor>(
  paginator: Paginator<TPage, TCursor>,
  pages: readonly TPage[],
  cursors: readonly unknown[]
): void {
  for (let index = 0; index < pages.length; index += 1) {
    paginator.next(itemAt(pages, index), cursorFrom<TCursor>(cursors[index]));
  }
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { kind } = scenarioCase;
  const input = scenarioCase.input.paginator;
  const expected = scenarioCase.expected;

  const runnerMap: Record<ScenarioKind, () => Promise<void> | void> = {
  'creation-pages-empty': () => {
    const paginator = Paginator.create<string, number>();
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'creation-has-next': () => {
    const paginator = Paginator.create<string, number>();
    assert.equal(paginator.hasNext(), expected.hasNext);
    return;
  },

  'accumulation-single-page': () => {
    const paginator = Paginator.create<string, number>();
    const pages = arrayField(input, 'pages') as string[];
    paginator.next(itemAt(pages, 0), cursorFrom<number>(input.nextCursor));
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
    return;
  },

  'accumulation-multiple-pages': () => {
    const paginator = Paginator.create<string, number>();
    applyPages(paginator, arrayField(input, 'pages') as string[], arrayField(input, 'nextCursors'));
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
    return;
  },

  'accumulation-pages-defensive-snapshot': () => {
    const paginator = Paginator.create<string, number>();
    const pages = arrayField(input, 'pages') as string[];
    paginator.next(itemAt(pages, 0), cursorFrom<number>(input.nextCursor));
    const snapshot = paginator.pages;
    Reflect.set(snapshot, 0, 'tampered');
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'accumulation-nested-pages-detached': () => {
    const paginator = Paginator.create<{ 'items': { 'name': string }[] }, number>();
    const page = structuredClone(recordField(input, 'page')) as { 'items': { 'name': string }[] };

    paginator.next(page, cursorFrom<number>(input.nextCursor));
    page.items[0] = itemAt(recordField(input, 'mutatedPage').items as { 'name': string }[], 0);

    const snapshot = paginator.pages;
    const firstPage = snapshot[0];
    assert.equal(firstPage?.items[0]?.name, 'original');
    if (firstPage !== undefined) {
      firstPage.items[0] = { 'name': 'returned mutation' };
    }

    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'accumulation-many-pages': () => {
    const paginator = Paginator.create<string, number>();
    const pageCount = numberField(recordField(input, 'batch'), 'pageCount');

    for (let index = 0; index < pageCount; index += 1) {
      paginator.next(`page-${index}`, { 'cursor': index, 'exhausted': false });
    }

    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.pages.length, expected.length);
    return;
  },

  'exhaustion-first-page': () => {
    const paginator = Paginator.create<string, number>();
    const pages = arrayField(input, 'pages') as string[];
    paginator.next(itemAt(pages, 0), cursorFrom<number>(input.nextCursor));
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'exhaustion-later-page': () => {
    const paginator = Paginator.create<string, number>();
    applyPages(paginator, arrayField(input, 'pages') as string[], arrayField(input, 'nextCursors'));
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'exhaustion-after-exhaustion-throws': () => {
    const paginator = Paginator.create<string, number>();
    const pages = arrayField(input, 'pages') as string[];
    paginator.next(itemAt(pages, 0), cursorFrom<number>(input.nextCursor));
    assert.throws(() => { paginator.next(itemAt(pages, 1), cursorFrom<number>(input.nextCursor)); }, Error);
    assert.equal(expected.throws, true);
    return;
  },

  'exhaustion-undefined-cursor': () => {
    const paginator = Paginator.create<string, string | undefined>();
    applyPages(paginator, arrayField(input, 'pages') as string[], arrayField(input, 'nextCursors'));
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'hooks-record-transitions': () => {
    const paginator = TrackingPaginator.create();
    paginator.next(stringField(input, 'page'), cursorFrom<number>(input.nextCursor));
    assert.deepEqual(paginator.transitions, expected.transitions);
    assert.deepEqual(paginator.exits, expected.exits);
    assert.deepEqual(paginator.enters, expected.enters);
    assert.deepEqual(paginator.order, expected.order);
    return;
  },

  'hooks-skip-hasmore-self-transition': () => {
    const paginator = TrackingPaginator.create();
    applyPages(paginator, arrayField(input, 'pages') as string[], arrayField(input, 'nextCursors'));
    assert.equal(paginator.transitions.length, expected.transitions);
    assert.equal(paginator.enters.length, expected.enters);
    assert.equal(paginator.exits.length, expected.exits);
    return;
  },

  'hooks-record-exhausted-reset': () => {
    const paginator = TrackingPaginator.create();
    applyPages(paginator, arrayField(input, 'pages') as string[], arrayField(input, 'nextCursors'));
    paginator.reset();
    assert.deepEqual(paginator.transitions.at(-1), expected.lastTransition);
    return;
  },

  'hooks-rejected-after-exhaustion': () => {
    const paginator = TrackingPaginator.create();
    const pages = arrayField(input, 'pages') as string[];
    const nextCursors = arrayField(input, 'nextCursors');
    paginator.next(itemAt(pages, 0), cursorFrom<number>(nextCursors[0]));
    assert.throws(() => { paginator.next(itemAt(pages, 1), cursorFrom<number>(nextCursors[1])); });
    assert.equal(paginator.rejections.length, expected.rejections);
    const rejection = itemAt(paginator.rejections, 0);
    assert.equal(rejection.state, expected.state);
    assert.equal(rejection.event, expected.event);
    assert.ok(rejection.reason.length > 0);
    return;
  },

  'hooks-retain-detached-cursor-snapshot': () => {
    const paginator = CursorSnapshotPaginator.create();
    const cursor = objectCursorFrom(recordField(input, 'cursor'));
    paginator.next(stringField(input, 'page'), objectCursorNextCursorFrom(cursor, recordField(input, 'nextCursor')));
    cursor.token.value = stringField(input, 'mutatedValue');
    paginator.reset();
    assert.deepEqual(paginator.exitedCursorValues, expected.exitedCursorValues);
    return;
  },

  'hook-error-throwing-enter': () => {
    const paginator = ThrowingOnEnterPaginator.create();
    assert.throws(
      () => { paginator.next(stringField(input, 'page'), cursorFrom<number>(input.nextCursor)); },
      (err: unknown) => {
        if (!(err instanceof HookInvocationError) || !(err.cause instanceof Error)) {
          return false;
        }
        assert.equal(err.hookName, expected.hookName);
        assert.equal(err.cause.message, expected.causeMessage);
        return true;
      }
    );
    return;
  },

  'hook-error-async-rejection': async () => {
    const paginator = AsyncOverridePaginator.create();
    const pages = arrayField(input, 'pages') as string[];
    const nextCursors = arrayField(input, 'nextCursors');
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      paginator.next(itemAt(pages, 0), cursorFrom<number>(nextCursors[0]));
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.deepEqual(rejectionEvents, expected.rejectionEvents);
      assert.throws(
        () => { paginator.next(itemAt(pages, 1), cursorFrom<number>(nextCursors[1])); },
        (err: unknown) => {
          if (!(err instanceof HookInvocationError) || !(err.cause instanceof Error)) {
            return false;
          }
          assert.equal(err.hookName, 'onTransition');
          assert.equal(err.cause.message, 'onTransition async boom');
          return true;
        }
      );
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
    return;
  },

  'hook-error-owning-instance-isolation': async () => {
    const failing = AsyncOwnedPaginator.create();
    const healthy = AsyncOwnedPaginator.create();
    const failingInput = recordField(input, 'failing');
    const healthyInput = recordField(input, 'healthy');
    failing.configure(stringField(failingInput, 'name'), true);
    healthy.configure(stringField(healthyInput, 'name'), false);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const failingPages = arrayField(failingInput, 'pages') as string[];
      const failingCursors = arrayField(failingInput, 'nextCursors');
      const healthyPages = arrayField(healthyInput, 'pages') as string[];
      const healthyCursors = arrayField(healthyInput, 'nextCursors');

      failing.next(itemAt(failingPages, 0), cursorFrom<number>(failingCursors[0]));
      healthy.next(itemAt(healthyPages, 0), cursorFrom<number>(healthyCursors[0]));

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.equal(rejectionEvents.length, 0);
      healthy.next(itemAt(healthyPages, 1), cursorFrom<number>(healthyCursors[1]));
      assert.deepEqual(healthy.pages, healthyPages);

      assert.throws(
        () => { failing.next(itemAt(failingPages, 1), cursorFrom<number>(failingCursors[1])); },
        (err: unknown) => {
          if (!(err instanceof HookInvocationError)) {
            return false;
          }
          assert.equal(err.hookName, 'onTransition');
          assert.equal(err.cause, failing.failure);
          err.message = 'mutated propagated wrapper';
          failing.failure.message = 'mutated original cause';
          failing.failureDetails.labels.push('propagated mutation');
          return true;
        }
      );

      const firstDiagnostics = failing.diagnostics();
      assert.equal(firstDiagnostics.length, 1);
      const firstCause = firstDiagnostics[0]?.cause;
      if (!(firstCause instanceof Error)) {
        throw new Error('Expected retained diagnostic cause');
      }
      assert.equal(firstCause.message, recordField(expected, 'firstDiagnostics').causeMessage);
      const firstDetails = firstCause.cause;
      if (firstDetails === null || typeof firstDetails !== 'object') {
        throw new Error('Expected retained diagnostic details');
      }
      const firstLabels: unknown = Reflect.get(firstDetails, 'labels');
      assert.deepEqual(firstLabels, recordField(expected, 'firstDiagnostics').labels);
      if (!Array.isArray(firstLabels)) {
        throw new Error('Expected retained diagnostic labels');
      }
      firstLabels.push('returned mutation');

      const secondCause = failing.diagnostics()[0]?.cause;
      if (!(secondCause instanceof Error)) {
        throw new Error('Expected second diagnostic cause');
      }
      const secondDetails = secondCause.cause;
      if (secondDetails === null || typeof secondDetails !== 'object') {
        throw new Error('Expected second diagnostic details');
      }
      assert.deepEqual(Reflect.get(secondDetails, 'labels'), recordField(expected, 'firstDiagnostics').labels);

      assert.deepEqual(failing.pages, expected.pages);
      assert.deepEqual(failing.transitions, expected.transitions);
      assert.deepEqual(healthy.transitions, expected.healthyTransitions);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
    return;
  },

  'reentrancy-next': () => {
    const paginator = ReentrantNextPaginator.create();
    const pages = arrayField(input, 'pages') as string[];
    const nextCursors = arrayField(input, 'nextCursors');
    paginator.next(itemAt(pages, 0), cursorFrom<number>(nextCursors[0]));
    assert.deepEqual(paginator.pages, pages.slice(0, 2));
    assert.equal(paginator.hasNext(), expected.hasNext);
    paginator.next(itemAt(pages, 2), cursorFrom<number>(nextCursors[2]));
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'reentrancy-reset': () => {
    const paginator = ReentrantResetPaginator.create();
    const pages = arrayField(input, 'pages') as string[];
    paginator.next(itemAt(pages, 0), cursorFrom<number>(input.nextCursor));
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.equal(paginator.enterCount, expected.enterCount, 'same-instance nested hook dispatch is stopped by reentrancy detection');
    return;
  },

  'reentrancy-cross-instance': () => {
    const target = CrossInstanceReentrantPaginator.create();
    const source = CrossInstanceReentrantPaginator.create();
    target.configure(stringField(input, 'targetName'));
    source.configure(stringField(input, 'sourceName'), target);
    const pages = arrayField(input, 'pages') as string[];
    source.next(itemAt(pages, 0), cursorFrom<number>(input.nextCursor));
    assert.deepEqual(source.pages, expected.sourcePages);
    assert.deepEqual(target.pages, expected.targetPages);
    assert.deepEqual(source.enters, expected.sourceEnters);
    assert.deepEqual(target.enters, expected.targetEnters);
    return;
  },

  'discriminant-narrowing': () => {
    assert.equal(describeCursor(cursorFrom<number>(input.cursorAvailable)), expected.cursorAvailable);
    assert.equal(describeCursor(cursorFrom<number>(input.cursorExhausted)), expected.cursorExhausted);
    assert.equal(describeEvent(input.resetEvent as PaginatorResetEventEntity.Type), expected.resetEvent);
    assert.equal(describeEvent(input.pageEvent as PaginatorPageReceivedEventInterface<string, number>), expected.pageEvent);
    assert.equal(describeState(input.stateIdle as PaginatorIdleStateEntity.Type), expected.stateIdle);
    assert.equal(describeState(input.stateHasMore as PaginatorHasMoreStateInterface<string, number>), expected.stateHasMore);
    assert.equal(describeState(input.stateExhausted as PaginatorExhaustedStateInterface<string>), expected.stateExhausted);
    return;
  }
  };

  await runnerMap[kind]();
}

void describe('Paginator', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
