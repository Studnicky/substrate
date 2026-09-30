import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';



import type {
  PaginatorExhaustedCursorEntity,
  PaginatorIdleStateEntity,
  PaginatorResetEventEntity
} from '../../../src/entities/index.js';
import type {
  PaginatorAvailableCursorInterface,
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorPageReceivedEventInterface
} from '../../../src/interfaces/index.js';

import { Paginator, PaginatorCloneError } from '../../../src/index.js';
import { PaginatorScenarioCaseEntity } from '../entities/PaginatorScenarioCaseEntity.js';

type ScenarioCase = PaginatorScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];

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
    throw RuntimeError.create('onEnterState boom');
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
    throw RuntimeError.create('onTransition async boom');
  }
}

class AsyncOwnedPaginator extends Paginator<string, number> {
  readonly failureDetails = { 'labels': ['initial'] };
  failure = RuntimeError.create('unconfigured transition failure');
  readonly transitions: string[] = [];
  private name = 'unconfigured';
  private rejectNextTransition = false;

  configure(name: string, rejectNextTransition: boolean): void {
    this.name = name;
    this.failure = RuntimeError.create(`${name} transition boom`, { 'cause': this.failureDetails });
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recordField(input: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = input[key];
  if (isPlainRecord(value)) {
    return value;
  }
  throw RuntimeError.create(`Expected record field ${key}`);
}

function arrayField(input: Record<string, unknown>, key: string): unknown[] {
  const value = input[key];
  assert.ok(Array.isArray(value));
  return value;
}

function isStringArray(value: readonly unknown[]): value is string[] {
  return value.every((item) => typeof item === 'string');
}

function stringArrayField(input: Record<string, unknown>, key: string): string[] {
  const value = arrayField(input, key);
  if (isStringArray(value)) {
    return value;
  }
  throw RuntimeError.create(`Expected string array field ${key}`);
}

function stringField(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string') {
    throw RuntimeError.create(`Expected string field ${key}`);
  }
  return value;
}

function numberField(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  if (typeof value !== 'number') {
    throw RuntimeError.create(`Expected number field ${key}`);
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
    throw RuntimeError.create(`Expected item at index ${String(index)}`);
  }
  return value;
}

interface NamedItem {
  name: string;
}

interface NamedItemsPage {
  items: NamedItem[];
}

function isNamedItem(value: unknown): value is NamedItem {
  return value !== null && typeof value === 'object' && typeof Reflect.get(value, 'name') === 'string';
}

function namedItemsPageFrom(input: Record<string, unknown>): NamedItemsPage {
  const items = arrayField(input, 'items');
  if (items.every(isNamedItem)) {
    return { items };
  }
  throw RuntimeError.create('Expected items array of { name: string }');
}

function isCursorLike(value: unknown): value is { cursor?: unknown; exhausted: boolean } {
  return value !== null && typeof value === 'object' && typeof Reflect.get(value, 'exhausted') === 'boolean';
}

function cursorFrom<TCursor>(
  value: unknown,
  parseCursor: (raw: unknown) => TCursor
): PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type {
  if (!isCursorLike(value)) {
    throw RuntimeError.create('Expected cursor-like payload');
  }
  if (value.exhausted) {
    return { 'exhausted': true };
  }

  return { 'cursor': parseCursor(value.cursor), 'exhausted': false };
}

function parseNumberCursor(raw: unknown): number {
  if (typeof raw !== 'number') {
    throw RuntimeError.create('Expected number cursor');
  }
  return raw;
}

/** The fixture encodes an absent cursor as `{ shape: 'undefined' }`, since JSON has no `undefined` literal. */
function parseOptionalStringCursor(raw: unknown): string | undefined {
  if (raw !== null && typeof raw === 'object' && Reflect.get(raw, 'shape') === 'undefined') {
    return undefined;
  }
  if (typeof raw === 'string') {
    return raw;
  }
  throw RuntimeError.create('Expected string or undefined cursor');
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
  cursors: readonly unknown[],
  parseCursor: (raw: unknown) => TCursor
): void {
  for (let index = 0; index < pages.length; index += 1) {
    paginator.next(itemAt(pages, index), cursorFrom(cursors[index], parseCursor));
  }
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { shape } = scenarioCase;
  const input = scenarioCase.input.paginator;
  const expected = scenarioCase.expected;

  const runnerMap: Record<ScenarioShape, () => Promise<void> | void> = {
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
    const pages = stringArrayField(input, 'pages');
    paginator.next(itemAt(pages, 0), cursorFrom(input.nextCursor, parseNumberCursor));
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
    return;
  },

  'accumulation-multiple-pages': () => {
    const paginator = Paginator.create<string, number>();
    applyPages(paginator, stringArrayField(input, 'pages'), arrayField(input, 'nextCursors'), parseNumberCursor);
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
    return;
  },

  'accumulation-pages-defensive-snapshot': () => {
    const paginator = Paginator.create<string, number>();
    const pages = stringArrayField(input, 'pages');
    paginator.next(itemAt(pages, 0), cursorFrom(input.nextCursor, parseNumberCursor));
    const snapshot = paginator.pages;
    Reflect.set(snapshot, 0, 'tampered');
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'accumulation-nested-pages-detached': () => {
    const paginator = Paginator.create<NamedItemsPage, number>();
    const page = structuredClone(namedItemsPageFrom(recordField(input, 'page')));

    paginator.next(page, cursorFrom(input.nextCursor, parseNumberCursor));
    page.items[0] = itemAt(namedItemsPageFrom(recordField(input, 'mutatedPage')).items, 0);

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
    const pages = stringArrayField(input, 'pages');
    paginator.next(itemAt(pages, 0), cursorFrom(input.nextCursor, parseNumberCursor));
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'exhaustion-later-page': () => {
    const paginator = Paginator.create<string, number>();
    applyPages(paginator, stringArrayField(input, 'pages'), arrayField(input, 'nextCursors'), parseNumberCursor);
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'exhaustion-after-exhaustion-throws': () => {
    const paginator = Paginator.create<string, number>();
    const pages = stringArrayField(input, 'pages');
    paginator.next(itemAt(pages, 0), cursorFrom(input.nextCursor, parseNumberCursor));
    assert.throws(() => { paginator.next(itemAt(pages, 1), cursorFrom(input.nextCursor, parseNumberCursor)); }, Error);
    assert.equal(expected.throws, true);
    return;
  },

  'exhaustion-undefined-cursor': () => {
    const paginator = Paginator.create<string, string | undefined>();
    applyPages(paginator, stringArrayField(input, 'pages'), arrayField(input, 'nextCursors'), parseOptionalStringCursor);
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'hooks-record-transitions': () => {
    const paginator = TrackingPaginator.create();
    paginator.next(stringField(input, 'page'), cursorFrom(input.nextCursor, parseNumberCursor));
    assert.deepEqual(paginator.transitions, expected.transitions);
    assert.deepEqual(paginator.exits, expected.exits);
    assert.deepEqual(paginator.enters, expected.enters);
    assert.deepEqual(paginator.order, expected.order);
    return;
  },

  'hooks-skip-hasmore-self-transition': () => {
    const paginator = TrackingPaginator.create();
    applyPages(paginator, stringArrayField(input, 'pages'), arrayField(input, 'nextCursors'), parseNumberCursor);
    assert.equal(paginator.transitions.length, expected.transitions);
    assert.equal(paginator.enters.length, expected.enters);
    assert.equal(paginator.exits.length, expected.exits);
    return;
  },

  'hooks-record-exhausted-reset': () => {
    const paginator = TrackingPaginator.create();
    applyPages(paginator, stringArrayField(input, 'pages'), arrayField(input, 'nextCursors'), parseNumberCursor);
    paginator.reset();
    assert.deepEqual(paginator.transitions.at(-1), expected.lastTransition);
    return;
  },

  'hooks-rejected-after-exhaustion': () => {
    const paginator = TrackingPaginator.create();
    const pages = stringArrayField(input, 'pages');
    const nextCursors = arrayField(input, 'nextCursors');
    paginator.next(itemAt(pages, 0), cursorFrom(nextCursors[0], parseNumberCursor));
    assert.throws(() => { paginator.next(itemAt(pages, 1), cursorFrom(nextCursors[1], parseNumberCursor)); });
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
      () => { paginator.next(stringField(input, 'page'), cursorFrom(input.nextCursor, parseNumberCursor)); },
      (err: Error) => {
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
    const pages = stringArrayField(input, 'pages');
    const nextCursors = arrayField(input, 'nextCursors');
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      paginator.next(itemAt(pages, 0), cursorFrom(nextCursors[0], parseNumberCursor));
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.deepEqual(rejectionEvents, expected.rejectionEvents);
      assert.throws(
        () => { paginator.next(itemAt(pages, 1), cursorFrom(nextCursors[1], parseNumberCursor)); },
        (err: Error) => {
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
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const failingPages = stringArrayField(failingInput, 'pages');
      const failingCursors = arrayField(failingInput, 'nextCursors');
      const healthyPages = stringArrayField(healthyInput, 'pages');
      const healthyCursors = arrayField(healthyInput, 'nextCursors');

      failing.next(itemAt(failingPages, 0), cursorFrom(failingCursors[0], parseNumberCursor));
      healthy.next(itemAt(healthyPages, 0), cursorFrom(healthyCursors[0], parseNumberCursor));

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.equal(rejectionEvents.length, 0);
      healthy.next(itemAt(healthyPages, 1), cursorFrom(healthyCursors[1], parseNumberCursor));
      assert.deepEqual(healthy.pages, healthyPages);

      assert.throws(
        () => { failing.next(itemAt(failingPages, 1), cursorFrom(failingCursors[1], parseNumberCursor)); },
        (err: Error) => {
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
        throw RuntimeError.create('Expected retained diagnostic cause');
      }
      assert.equal(firstCause.message, recordField(expected, 'firstDiagnostics').causeMessage);
      const firstDetails = firstCause.cause;
      if (firstDetails === null || typeof firstDetails !== 'object') {
        throw RuntimeError.create('Expected retained diagnostic details');
      }
      const firstLabels: unknown = Reflect.get(firstDetails, 'labels');
      assert.deepEqual(firstLabels, recordField(expected, 'firstDiagnostics').labels);
      if (!Array.isArray(firstLabels)) {
        throw RuntimeError.create('Expected retained diagnostic labels');
      }
      firstLabels.push('returned mutation');

      const secondCause = failing.diagnostics()[0]?.cause;
      if (!(secondCause instanceof Error)) {
        throw RuntimeError.create('Expected second diagnostic cause');
      }
      const secondDetails = secondCause.cause;
      if (secondDetails === null || typeof secondDetails !== 'object') {
        throw RuntimeError.create('Expected second diagnostic details');
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
    const pages = stringArrayField(input, 'pages');
    const nextCursors = arrayField(input, 'nextCursors');
    paginator.next(itemAt(pages, 0), cursorFrom(nextCursors[0], parseNumberCursor));
    assert.deepEqual(paginator.pages, pages.slice(0, 2));
    assert.equal(paginator.hasNext(), expected.hasNext);
    paginator.next(itemAt(pages, 2), cursorFrom(nextCursors[2], parseNumberCursor));
    assert.deepEqual(paginator.pages, expected.pages);
    return;
  },

  'reentrancy-reset': () => {
    const paginator = ReentrantResetPaginator.create();
    const pages = stringArrayField(input, 'pages');
    paginator.next(itemAt(pages, 0), cursorFrom(input.nextCursor, parseNumberCursor));
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
    const pages = stringArrayField(input, 'pages');
    source.next(itemAt(pages, 0), cursorFrom(input.nextCursor, parseNumberCursor));
    assert.deepEqual(source.pages, expected.sourcePages);
    assert.deepEqual(target.pages, expected.targetPages);
    assert.deepEqual(source.enters, expected.sourceEnters);
    assert.deepEqual(target.enters, expected.targetEnters);
    return;
  },

  'discriminant-narrowing': () => {
    const paginator = Paginator.create<string, number>();
    const pages = stringArrayField(input, 'pages');
    const cursors = arrayField(input, 'nextCursors');

    paginator.next(itemAt(pages, 0), cursorFrom(cursors[0], parseNumberCursor));
    assert.deepEqual(paginator.pages, expected.pagesAfterFirst);
    assert.equal(paginator.hasNext(), expected.hasNextAfterFirst);

    paginator.next(itemAt(pages, 1), cursorFrom(cursors[1], parseNumberCursor));
    assert.deepEqual(paginator.pages, expected.pagesAfterSecond);
    assert.equal(paginator.hasNext(), expected.hasNextAfterSecond);

    paginator.reset();
    assert.deepEqual(paginator.pages, expected.pagesAfterReset);
    assert.equal(paginator.hasNext(), expected.hasNextAfterReset);
    return;
  }
  };

  await runnerMap[shape]();
}

const fileIntake = ScenarioFileCompiler.compileIntake(PaginatorScenarioCaseEntity.Schema, PaginatorScenarioCaseEntity.Node);

void describe('Paginator', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }

  void it('surfaces an uncloneable page as a PaginatorCloneError carrying the platform error', () => {
    const paginator = Paginator.create<unknown, string>();

    assert.throws(() => { paginator.next(() => undefined, { 'cursor': 'c', 'exhausted': false }); }, (error: unknown) => {
      return error instanceof PaginatorCloneError && error.code === 'paginator.valueNotCloneable' && error.cause instanceof Error;
    });
  });
});
