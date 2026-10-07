import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TransitionRecordEntity } from '../../../examples/entities/TransitionRecordEntity.js';
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

import { ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Paginator } from '../../../src/index.js';
import { PaginatorNamedPageEntity } from './entities/PaginatorNamedPageEntity.js';
import { PaginatorObjectCursorEntity } from './entities/PaginatorObjectCursorEntity.js';
import { PaginatorScenarioCaseEntity } from './entities/PaginatorScenarioCaseEntity.js';
import scenarioGroups from './paginator.scenarios.json' with { 'type': 'json' };

class TrackingPaginator extends Paginator<string, unknown> {
  readonly transitions: TransitionRecordEntity.Type[] = [];
  readonly enters: string[] = [];
  readonly exits: string[] = [];
  readonly order: string[] = [];
  readonly rejections: { 'event': string; 'reason': string; 'state': string }[] = [];

  protected override onTransition(
    from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>,
    to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, unknown>
  ): void {
    this.transitions.push({ 'event': event.type, 'from': from.variant, 'to': to.variant });
    this.order.push(`transition:${from.variant}->${to.variant}`);
  }

  protected override onEnterState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.enters.push(state.variant);
    this.order.push(`enter:${state.variant}`);
  }

  protected override onExitState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.exits.push(state.variant);
    this.order.push(`exit:${state.variant}`);
  }

  protected override onTransitionRejected(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, unknown>,
    reason: string
  ): void {
    this.rejections.push({ 'event': event.type, 'reason': reason, 'state': state.variant });
    this.order.push(`rejected:${state.variant}:${event.type}`);
  }
}

class CursorSnapshotPaginator extends Paginator<string, PaginatorObjectCursorEntity.Type> {
  readonly exitedCursorValues: string[] = [];

  protected override onExitState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, PaginatorObjectCursorEntity.Type>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    if (state.variant === 'hasMore') {
      this.exitedCursorValues.push(state.cursor.token.value);
    }
  }
}

class ThrowingOnEnterPaginator extends Paginator<string, unknown> {
  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    throw RuntimeError.create('onEnterState boom');
  }
}

class AsyncOverridePaginator extends Paginator<string, unknown> {
  protected override onTransition(
    _from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>,
    _to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>,
    _event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, unknown>
  ): Promise<void> {
    const result = Promise.reject(RuntimeError.create('onTransition async boom'));

    return result;
  }
}

class AsyncOwnedPaginator extends Paginator<string, unknown> {
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
    const result = this.hooks.getHookErrors();

    return result;
  }

  protected override async onTransition(
    _from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>,
    to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>,
    _event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, unknown>
  ): Promise<void> {
    this.transitions.push(`${this.name}:${to.variant}`);

    if (this.rejectNextTransition) {
      this.rejectNextTransition = false;
      await Promise.resolve();
      throw this.failure;
    }
  }
}

class ReentrantNextPaginator extends Paginator<string, unknown> {
  private reentered = false;

  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    if (this.reentered) {
      return;
    }
    this.reentered = true;
    this.next('page-2', { 'cursor': 3, 'exhausted': false });
  }
}

class ReentrantResetPaginator extends Paginator<string, unknown> {
  enterCount = 0;
  private reentered = false;

  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, unknown>
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

class CrossInstanceReentrantPaginator extends Paginator<string, unknown> {
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
    | PaginatorHasMoreStateInterface<string, unknown>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.enters.push(`${this.name}:${state.variant}`);

    if (!this.reentered && this.target !== undefined) {
      this.reentered = true;
      this.target.next(`${this.name}-delegated-page`, { 'cursor': 2, 'exhausted': false });
    }
  }
}

class PaginatorScenarioFields {
  static itemAt<TValue>(values: readonly TValue[], index: number): TValue {
    const result = ScenarioValues.requireDefined(values[index], `values[${String(index)}]`);

    return result;
  }

  static readCursor(value: unknown): PaginatorAvailableCursorInterface<unknown> | PaginatorExhaustedCursorEntity.Type {
    const cursor = ScenarioValues.requireRecord(value, 'cursor');

    if (cursor.exhausted === true) {
      return { 'exhausted': true };
    }

    let normalizedCursor: unknown = cursor.cursor;
    if (typeof cursor.cursor === 'object' && cursor.cursor !== null && Reflect.get(cursor.cursor, 'shape') === 'undefined') {
      normalizedCursor = undefined;
    }

    return { 'cursor': normalizedCursor, 'exhausted': false };
  }

  static readObjectCursorNext(
    cursor: PaginatorObjectCursorEntity.Type,
    value: unknown
  ): PaginatorAvailableCursorInterface<PaginatorObjectCursorEntity.Type> {
    const record = ScenarioValues.requireRecord(value, 'nextCursor');
    const exhausted = ScenarioValues.requireBoolean(record.exhausted, 'exhausted');
    assert.equal(exhausted, false);

    return { 'cursor': cursor, 'exhausted': false };
  }

  static cloneValue(value: unknown): unknown {
    try {
      const result = structuredClone(value);

      return result;
    } catch (error) {
      throw RuntimeError.create('Scenario value is not cloneable', { 'cause': error });
    }
  }

  static applyPages<TPage>(
    paginator: Paginator<TPage, unknown>,
    pages: readonly TPage[],
    cursors: readonly unknown[]
  ): void {
    for (let index = 0; index < pages.length; index += 1) {
      paginator.next(PaginatorScenarioFields.itemAt(pages, index), PaginatorScenarioFields.readCursor(cursors[index]));
    }
  }
}

class PaginatorScenarioRunners {
  static 'accumulation-many-pages'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    const batch = ScenarioValues.requireRecord(input.batch, 'batch');
    const pageCount = ScenarioValues.requireNumber(batch.pageCount, 'pageCount');

    for (let index = 0; index < pageCount; index += 1) {
      paginator.next(`page-${String(index)}`, { 'cursor': index, 'exhausted': false });
    }

    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.pages.length, expected.length);
  }

  static 'accumulation-multiple-pages'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    PaginatorScenarioFields.applyPages(
      paginator,
      ScenarioValues.requireStringArray(input.pages, 'pages'),
      ScenarioValues.requireArray(input.nextCursors, 'nextCursors')
    );
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
  }

  static 'accumulation-nested-pages-detached'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<PaginatorNamedPageEntity.Type, unknown>();
    const page = PaginatorNamedPageEntity.intake(PaginatorScenarioFields.cloneValue(input.page));

    paginator.next(page, PaginatorScenarioFields.readCursor(input.nextCursor));
    const mutatedPage = PaginatorNamedPageEntity.intake(input.mutatedPage);
    page.items[0] = PaginatorScenarioFields.itemAt(mutatedPage.items, 0);

    const snapshot = paginator.pages;
    const firstPage = snapshot[0];
    assert.equal(firstPage?.items[0]?.name, 'original');
    if (firstPage !== undefined) {
      firstPage.items[0] = { 'name': 'returned mutation' };
    }

    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'accumulation-pages-defensive-snapshot'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(input.nextCursor));
    const snapshot = paginator.pages;
    Reflect.set(snapshot, 0, 'tampered');
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'accumulation-single-page'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(input.nextCursor));
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
  }

  static 'creation-has-next'(_input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    assert.equal(paginator.hasNext(), expected.hasNext);
  }

  static 'creation-pages-empty'(_input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'discriminant-narrowing'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    const cursors = ScenarioValues.requireArray(input.nextCursors, 'nextCursors');

    paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(cursors[0]));
    assert.deepEqual(paginator.pages, expected.pagesAfterFirst);
    assert.equal(paginator.hasNext(), expected.hasNextAfterFirst);

    paginator.next(PaginatorScenarioFields.itemAt(pages, 1), PaginatorScenarioFields.readCursor(cursors[1]));
    assert.deepEqual(paginator.pages, expected.pagesAfterSecond);
    assert.equal(paginator.hasNext(), expected.hasNextAfterSecond);

    paginator.reset();
    assert.deepEqual(paginator.pages, expected.pagesAfterReset);
    assert.equal(paginator.hasNext(), expected.hasNextAfterReset);
  }

  static 'exhaustion-after-exhaustion-throws'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(input.nextCursor));
    assert.throws(() => {
      paginator.next(PaginatorScenarioFields.itemAt(pages, 1), PaginatorScenarioFields.readCursor(input.nextCursor));
    }, Error);
    assert.equal(expected.throws, true);
  }

  static 'exhaustion-first-page'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(input.nextCursor));
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'exhaustion-later-page'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    PaginatorScenarioFields.applyPages(
      paginator,
      ScenarioValues.requireStringArray(input.pages, 'pages'),
      ScenarioValues.requireArray(input.nextCursors, 'nextCursors')
    );
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'exhaustion-undefined-cursor'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = Paginator.create<string, unknown>();
    PaginatorScenarioFields.applyPages(
      paginator,
      ScenarioValues.requireStringArray(input.pages, 'pages'),
      ScenarioValues.requireArray(input.nextCursors, 'nextCursors')
    );
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static async 'hook-error-async-rejection'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): Promise<void> {
    const paginator = AsyncOverridePaginator.create();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    const nextCursors = ScenarioValues.requireArray(input.nextCursors, 'nextCursors');
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(nextCursors[0]));
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.deepEqual(rejectionEvents, expected.rejectionEvents);
      assert.throws(
        () => { paginator.next(PaginatorScenarioFields.itemAt(pages, 1), PaginatorScenarioFields.readCursor(nextCursors[1])); },
        (error: Error) => {
          if (!(error instanceof HookInvocationError) || !(error.cause instanceof Error)) {
            return false;
          }
          assert.equal(error.hookName, 'onTransition');
          assert.equal(error.cause.message, 'onTransition async boom');
          return true;
        }
      );
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'hook-error-owning-instance-isolation'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): Promise<void> {
    const failing = AsyncOwnedPaginator.create();
    const healthy = AsyncOwnedPaginator.create();
    const failingInput = ScenarioValues.requireRecord(input.failing, 'failing');
    const healthyInput = ScenarioValues.requireRecord(input.healthy, 'healthy');
    failing.configure(ScenarioValues.requireString(failingInput.name, 'name'), true);
    healthy.configure(ScenarioValues.requireString(healthyInput.name, 'name'), false);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const failingPages = ScenarioValues.requireStringArray(failingInput.pages, 'pages');
      const failingCursors = ScenarioValues.requireArray(failingInput.nextCursors, 'nextCursors');
      const healthyPages = ScenarioValues.requireStringArray(healthyInput.pages, 'pages');
      const healthyCursors = ScenarioValues.requireArray(healthyInput.nextCursors, 'nextCursors');

      failing.next(PaginatorScenarioFields.itemAt(failingPages, 0), PaginatorScenarioFields.readCursor(failingCursors[0]));
      healthy.next(PaginatorScenarioFields.itemAt(healthyPages, 0), PaginatorScenarioFields.readCursor(healthyCursors[0]));

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.equal(rejectionEvents.length, 0);
      healthy.next(PaginatorScenarioFields.itemAt(healthyPages, 1), PaginatorScenarioFields.readCursor(healthyCursors[1]));
      assert.deepEqual(healthy.pages, healthyPages);

      assert.throws(
        () => { failing.next(PaginatorScenarioFields.itemAt(failingPages, 1), PaginatorScenarioFields.readCursor(failingCursors[1])); },
        (error: Error) => {
          if (!(error instanceof HookInvocationError)) {
            return false;
          }
          assert.equal(error.hookName, 'onTransition');
          assert.equal(error.cause, failing.failure);
          error.message = 'mutated propagated wrapper';
          failing.failure.message = 'mutated original cause';
          failing.failureDetails.labels.push('propagated mutation');
          return true;
        }
      );

      const expectedDiagnostics = ScenarioValues.requireRecord(expected.firstDiagnostics, 'firstDiagnostics');
      const firstDiagnostics = failing.diagnostics();
      assert.equal(firstDiagnostics.length, 1);
      const firstCause = firstDiagnostics[0]?.cause;
      if (!(firstCause instanceof Error)) {
        throw RuntimeError.create('Expected retained diagnostic cause');
      }
      assert.equal(firstCause.message, expectedDiagnostics.causeMessage);
      const firstDetails = firstCause.cause;
      if (firstDetails === null || typeof firstDetails !== 'object') {
        throw RuntimeError.create('Expected retained diagnostic details');
      }
      const firstLabels: unknown = Reflect.get(firstDetails, 'labels');
      assert.deepEqual(firstLabels, expectedDiagnostics.labels);
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
      assert.deepEqual(Reflect.get(secondDetails, 'labels'), expectedDiagnostics.labels);

      assert.deepEqual(failing.pages, expected.pages);
      assert.deepEqual(failing.transitions, expected.transitions);
      assert.deepEqual(healthy.transitions, expected.healthyTransitions);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'hook-error-throwing-enter'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = ThrowingOnEnterPaginator.create();
    assert.throws(
      () => { paginator.next(ScenarioValues.requireString(input.page, 'page'), PaginatorScenarioFields.readCursor(input.nextCursor)); },
      (error: Error) => {
        if (!(error instanceof HookInvocationError) || !(error.cause instanceof Error)) {
          return false;
        }
        assert.equal(error.hookName, expected.hookName);
        assert.equal(error.cause.message, expected.causeMessage);
        return true;
      }
    );
  }

  static 'hooks-record-exhausted-reset'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = TrackingPaginator.create();
    PaginatorScenarioFields.applyPages(
      paginator,
      ScenarioValues.requireStringArray(input.pages, 'pages'),
      ScenarioValues.requireArray(input.nextCursors, 'nextCursors')
    );
    paginator.reset();
    assert.deepEqual(paginator.transitions.at(-1), expected.lastTransition);
  }

  static 'hooks-record-transitions'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = TrackingPaginator.create();
    paginator.next(ScenarioValues.requireString(input.page, 'page'), PaginatorScenarioFields.readCursor(input.nextCursor));
    assert.deepEqual(paginator.transitions, expected.transitions);
    assert.deepEqual(paginator.exits, expected.exits);
    assert.deepEqual(paginator.enters, expected.enters);
    assert.deepEqual(paginator.order, expected.order);
  }

  static 'hooks-rejected-after-exhaustion'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = TrackingPaginator.create();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    const nextCursors = ScenarioValues.requireArray(input.nextCursors, 'nextCursors');
    paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(nextCursors[0]));
    assert.throws(() => { paginator.next(PaginatorScenarioFields.itemAt(pages, 1), PaginatorScenarioFields.readCursor(nextCursors[1])); });
    assert.equal(paginator.rejections.length, expected.rejections);
    const rejection = PaginatorScenarioFields.itemAt(paginator.rejections, 0);
    assert.equal(rejection.state, expected.state);
    assert.equal(rejection.event, expected.event);
    assert.ok(rejection.reason.length > 0);
  }

  static 'hooks-retain-detached-cursor-snapshot'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = CursorSnapshotPaginator.create();
    const cursor = PaginatorObjectCursorEntity.intake(input.cursor);
    paginator.next(ScenarioValues.requireString(input.page, 'page'), PaginatorScenarioFields.readObjectCursorNext(cursor, input.nextCursor));
    cursor.token.value = ScenarioValues.requireString(input.mutatedValue, 'mutatedValue');
    paginator.reset();
    assert.deepEqual(paginator.exitedCursorValues, expected.exitedCursorValues);
  }

  static 'hooks-skip-hasmore-self-transition'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = TrackingPaginator.create();
    PaginatorScenarioFields.applyPages(
      paginator,
      ScenarioValues.requireStringArray(input.pages, 'pages'),
      ScenarioValues.requireArray(input.nextCursors, 'nextCursors')
    );
    assert.equal(paginator.transitions.length, expected.transitions);
    assert.equal(paginator.enters.length, expected.enters);
    assert.equal(paginator.exits.length, expected.exits);
  }

  static 'reentrancy-cross-instance'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const target = CrossInstanceReentrantPaginator.create();
    const source = CrossInstanceReentrantPaginator.create();
    target.configure(ScenarioValues.requireString(input.targetName, 'targetName'));
    source.configure(ScenarioValues.requireString(input.sourceName, 'sourceName'), target);
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    source.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(input.nextCursor));
    assert.deepEqual(source.pages, expected.sourcePages);
    assert.deepEqual(target.pages, expected.targetPages);
    assert.deepEqual(source.enters, expected.sourceEnters);
    assert.deepEqual(target.enters, expected.targetEnters);
  }

  static 'reentrancy-next'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = ReentrantNextPaginator.create();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    const nextCursors = ScenarioValues.requireArray(input.nextCursors, 'nextCursors');
    paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(nextCursors[0]));
    assert.deepEqual(paginator.pages, pages.slice(0, 2));
    assert.equal(paginator.hasNext(), expected.hasNext);
    paginator.next(PaginatorScenarioFields.itemAt(pages, 2), PaginatorScenarioFields.readCursor(nextCursors[2]));
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'reentrancy-reset'(input: PaginatorScenarioCaseEntity.Type['input']['paginator'], expected: PaginatorScenarioCaseEntity.Type['expected']): void {
    const paginator = ReentrantResetPaginator.create();
    const pages = ScenarioValues.requireStringArray(input.pages, 'pages');
    paginator.next(PaginatorScenarioFields.itemAt(pages, 0), PaginatorScenarioFields.readCursor(input.nextCursor));
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.equal(paginator.enterCount, expected.enterCount, 'same-instance nested hook dispatch is stopped by reentrancy detection');
  }

  static async run(scenarioCase: PaginatorScenarioCaseEntity.Type): Promise<void> {
    await PaginatorScenarioRunners[scenarioCase.shape](scenarioCase.input.paginator, scenarioCase.expected);
  }
}

void describe('Paginator', () => {
  const scenarioCases = scenarioGroups.cases.map((scenarioCase) => {
    const result = PaginatorScenarioCaseEntity.intake(scenarioCase);

    return result;
  });

  for (let index = 0; index < scenarioCases.length; index += 1) {
    const scenarioCase = ScenarioValues.requireDefined(scenarioCases[index], 'scenarioCases[index]');

    void it(scenarioCase.name, async () => {
      await PaginatorScenarioRunners.run(scenarioCase);
    });
  }
});
