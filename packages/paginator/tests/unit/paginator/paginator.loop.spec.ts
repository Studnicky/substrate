import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import timersPromises from 'node:timers/promises';

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
import type { PaginatorNamedItemsPageEntity } from '../entities/PaginatorNamedItemsPageEntity.js';
import type { PaginatorObjectCursorEntity } from '../entities/PaginatorObjectCursorEntity.js';
import type { PaginatorTransitionRecordEntity } from '../entities/PaginatorTransitionRecordEntity.js';

import { Paginator, PaginatorCloneError } from '../../../src/index.js';
import { PaginatorScenarioCaseEntity } from '../entities/PaginatorScenarioCaseEntity.js';
import scenarioGroups from './paginator.scenarios.json' with { 'type': 'json' };

class TrackingPaginator extends Paginator<string, number> {
  readonly transitions: PaginatorTransitionRecordEntity.Type[] = [];
  readonly enters: string[] = [];
  readonly exits: string[] = [];
  readonly order: string[] = [];
  readonly rejections: { 'event': string; 'reason': string; 'state': string }[] = [];

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

class ThrowingOnEnterPaginator extends Paginator<string, number> {
  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    throw RuntimeError.create('onEnterState boom');
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
    const hookErrors = this.hooks.getHookErrors();
    return hookErrors;
  }

  async recordTransition(variant: string): Promise<void> {
    this.transitions.push(`${this.name}:${variant}`);

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

class PaginatorRunners {
  static 'accumulation-many-pages'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'accumulation-many-pages'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();

    for (let index = 0; index < input.paginator.batch.pageCount; index += 1) {
      paginator.next(`page-${index}`, { 'cursor': index, 'exhausted': false });
    }

    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.pages.length, expected.length);
  }

  static 'accumulation-multiple-pages'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'accumulation-multiple-pages'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();
    PaginatorRunners.applyNumberPages(paginator, input.paginator.pages, input.paginator.nextCursors);
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
  }

  static 'accumulation-nested-pages-detached'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'accumulation-nested-pages-detached'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<PaginatorNamedItemsPageEntity.Type, number>();
    const page = PaginatorRunners.copyNamedItemsPage(input.paginator.page);

    paginator.next(page, PaginatorRunners.numberCursor(input.paginator.nextCursor));
    page.items[0] = PaginatorRunners.itemAt(input.paginator.mutatedPage.items, 0);

    const snapshot = paginator.pages;
    const firstPage = snapshot[0];
    assert.equal(firstPage?.items[0]?.name, 'original');
    if (firstPage !== undefined) {
      firstPage.items[0] = { 'name': 'returned mutation' };
    }

    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'accumulation-pages-defensive-snapshot'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'accumulation-pages-defensive-snapshot'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();
    paginator.next(PaginatorRunners.itemAt(input.paginator.pages, 0), PaginatorRunners.numberCursor(input.paginator.nextCursor));
    const snapshot = paginator.pages;
    Reflect.set(snapshot, 0, 'tampered');
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'accumulation-single-page'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'accumulation-single-page'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();
    paginator.next(PaginatorRunners.itemAt(input.paginator.pages, 0), PaginatorRunners.numberCursor(input.paginator.nextCursor));
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
  }

  static 'creation-has-next'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'creation-has-next'>): void {
    const paginator = Paginator.create<string, number>();
    assert.equal(paginator.hasNext(), scenarioCase.expected.hasNext);
  }

  static 'creation-pages-empty'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'creation-pages-empty'>): void {
    const paginator = Paginator.create<string, number>();
    assert.deepEqual(paginator.pages, scenarioCase.expected.pages);
  }

  static 'discriminant-narrowing'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'discriminant-narrowing'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();
    const { nextCursors, pages } = input.paginator;

    paginator.next(PaginatorRunners.itemAt(pages, 0), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(nextCursors, 0)));
    assert.deepEqual(paginator.pages, expected.pagesAfterFirst);
    assert.equal(paginator.hasNext(), expected.hasNextAfterFirst);

    paginator.next(PaginatorRunners.itemAt(pages, 1), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(nextCursors, 1)));
    assert.deepEqual(paginator.pages, expected.pagesAfterSecond);
    assert.equal(paginator.hasNext(), expected.hasNextAfterSecond);

    paginator.reset();
    assert.deepEqual(paginator.pages, expected.pagesAfterReset);
    assert.equal(paginator.hasNext(), expected.hasNextAfterReset);
  }

  static 'exhaustion-after-exhaustion-throws'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'exhaustion-after-exhaustion-throws'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();
    const { nextCursor, pages } = input.paginator;
    paginator.next(PaginatorRunners.itemAt(pages, 0), PaginatorRunners.numberCursor(nextCursor));
    assert.throws(() => { paginator.next(PaginatorRunners.itemAt(pages, 1), PaginatorRunners.numberCursor(nextCursor)); }, Error);
    assert.equal(expected.throws, true);
  }

  static 'exhaustion-first-page'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'exhaustion-first-page'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();
    paginator.next(PaginatorRunners.itemAt(input.paginator.pages, 0), PaginatorRunners.numberCursor(input.paginator.nextCursor));
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'exhaustion-later-page'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'exhaustion-later-page'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();
    PaginatorRunners.applyNumberPages(paginator, input.paginator.pages, input.paginator.nextCursors);
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'exhaustion-undefined-cursor'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'exhaustion-undefined-cursor'>): void {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, string | undefined>();
    const { nextCursors, pages } = input.paginator;
    for (let index = 0; index < pages.length; index += 1) {
      paginator.next(PaginatorRunners.itemAt(pages, index), PaginatorRunners.optionalStringCursor(PaginatorRunners.itemAt(nextCursors, index)));
    }
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static async 'hook-error-async-rejection'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'hook-error-async-rejection'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const paginator = Paginator.create<string, number>();
    // The base `onTransition` hook is typed `void`, so the asynchronous override is installed on the instance.
    Object.defineProperty(paginator, 'onTransition', {
      'value': (): Promise<void> => {
        const rejection = Promise.resolve().then((): void => {
          throw RuntimeError.create('onTransition async boom');
        });
        return rejection;
      }
    });
    const { nextCursors, pages } = input.paginator;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      paginator.next(PaginatorRunners.itemAt(pages, 0), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(nextCursors, 0)));
      await timersPromises.setImmediate();
      await timersPromises.setImmediate();
      assert.deepEqual(rejectionEvents, expected.rejectionEvents);
      assert.throws(
        () => { paginator.next(PaginatorRunners.itemAt(pages, 1), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(nextCursors, 1))); },
        (thrown: Error) => {
          assert.ok(thrown instanceof HookInvocationError);
          assert.ok(thrown.cause instanceof Error);
          assert.equal(thrown.hookName, 'onTransition');
          assert.equal(thrown.cause.message, 'onTransition async boom');
          return true;
        }
      );
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'hook-error-owning-instance-isolation'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'hook-error-owning-instance-isolation'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const failing = AsyncOwnedPaginator.create();
    const healthy = AsyncOwnedPaginator.create();
    const failingInput = input.paginator.failing;
    const healthyInput = input.paginator.healthy;
    failing.configure(failingInput.name, true);
    healthy.configure(healthyInput.name, false);
    PaginatorRunners.installTransitionRecorder(failing);
    PaginatorRunners.installTransitionRecorder(healthy);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      failing.next(PaginatorRunners.itemAt(failingInput.pages, 0), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(failingInput.nextCursors, 0)));
      healthy.next(PaginatorRunners.itemAt(healthyInput.pages, 0), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(healthyInput.nextCursors, 0)));

      await timersPromises.setImmediate();
      await timersPromises.setImmediate();

      assert.equal(rejectionEvents.length, 0);
      healthy.next(PaginatorRunners.itemAt(healthyInput.pages, 1), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(healthyInput.nextCursors, 1)));
      assert.deepEqual(healthy.pages, healthyInput.pages);

      assert.throws(
        () => { failing.next(PaginatorRunners.itemAt(failingInput.pages, 1), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(failingInput.nextCursors, 1))); },
        (thrown: Error) => {
          assert.ok(thrown instanceof HookInvocationError);
          assert.equal(thrown.hookName, 'onTransition');
          assert.equal(thrown.cause, failing.failure);
          thrown.message = 'mutated propagated wrapper';
          failing.failure.message = 'mutated original cause';
          failing.failureDetails.labels.push('propagated mutation');
          return true;
        }
      );

      const firstDiagnostics = failing.diagnostics();
      assert.equal(firstDiagnostics.length, 1);
      const firstCause = firstDiagnostics[0]?.cause;
      assert.ok(firstCause instanceof Error);
      assert.equal(firstCause.message, expected.firstDiagnostics.causeMessage);
      const firstDetails: unknown = firstCause.cause;
      assert.ok(firstDetails !== null && typeof firstDetails === 'object');
      const firstLabels: unknown = Reflect.get(firstDetails, 'labels');
      assert.deepEqual(firstLabels, expected.firstDiagnostics.labels);
      assert.ok(Array.isArray(firstLabels));
      firstLabels.push('returned mutation');

      const secondCause = failing.diagnostics()[0]?.cause;
      assert.ok(secondCause instanceof Error);
      const secondDetails: unknown = secondCause.cause;
      assert.ok(secondDetails !== null && typeof secondDetails === 'object');
      assert.deepEqual(Reflect.get(secondDetails, 'labels'), expected.firstDiagnostics.labels);

      assert.deepEqual(failing.pages, expected.pages);
      assert.deepEqual(failing.transitions, expected.transitions);
      assert.deepEqual(healthy.transitions, expected.healthyTransitions);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'hook-error-throwing-enter'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'hook-error-throwing-enter'>): void {
    const { expected, input } = scenarioCase;
    const paginator = ThrowingOnEnterPaginator.create();
    assert.throws(
      () => { paginator.next(input.paginator.page, PaginatorRunners.numberCursor(input.paginator.nextCursor)); },
      (thrown: Error) => {
        assert.ok(thrown instanceof HookInvocationError);
        assert.ok(thrown.cause instanceof Error);
        assert.equal(thrown.hookName, expected.hookName);
        assert.equal(thrown.cause.message, expected.causeMessage);
        return true;
      }
    );
  }

  static 'hooks-record-exhausted-reset'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'hooks-record-exhausted-reset'>): void {
    const { expected, input } = scenarioCase;
    const paginator = TrackingPaginator.create();
    PaginatorRunners.applyNumberPages(paginator, input.paginator.pages, input.paginator.nextCursors);
    paginator.reset();
    assert.deepEqual(paginator.transitions.at(-1), expected.lastTransition);
  }

  static 'hooks-record-transitions'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'hooks-record-transitions'>): void {
    const { expected, input } = scenarioCase;
    const paginator = TrackingPaginator.create();
    paginator.next(input.paginator.page, PaginatorRunners.numberCursor(input.paginator.nextCursor));
    assert.deepEqual(paginator.transitions, expected.transitions);
    assert.deepEqual(paginator.exits, expected.exits);
    assert.deepEqual(paginator.enters, expected.enters);
    assert.deepEqual(paginator.order, expected.order);
  }

  static 'hooks-rejected-after-exhaustion'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'hooks-rejected-after-exhaustion'>): void {
    const { expected, input } = scenarioCase;
    const paginator = TrackingPaginator.create();
    const { nextCursors, pages } = input.paginator;
    paginator.next(PaginatorRunners.itemAt(pages, 0), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(nextCursors, 0)));
    assert.throws(() => { paginator.next(PaginatorRunners.itemAt(pages, 1), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(nextCursors, 1))); });
    assert.equal(paginator.rejections.length, expected.rejections);
    const rejection = PaginatorRunners.itemAt(paginator.rejections, 0);
    assert.equal(rejection.state, expected.state);
    assert.equal(rejection.event, expected.event);
    assert.ok(rejection.reason.length > 0);
  }

  static 'hooks-retain-detached-cursor-snapshot'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'hooks-retain-detached-cursor-snapshot'>): void {
    const { expected, input } = scenarioCase;
    const paginator = CursorSnapshotPaginator.create();
    const cursor: PaginatorObjectCursorEntity.Type = { 'token': { 'value': input.paginator.cursor.token.value } };
    const nextCursor: PaginatorAvailableCursorInterface<PaginatorObjectCursorEntity.Type> = { 'cursor': cursor, 'exhausted': false };
    assert.equal(input.paginator.nextCursor.exhausted, false);
    paginator.next(input.paginator.page, nextCursor);
    cursor.token.value = input.paginator.mutatedValue;
    paginator.reset();
    assert.deepEqual(paginator.exitedCursorValues, expected.exitedCursorValues);
  }

  static 'hooks-skip-hasmore-self-transition'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'hooks-skip-hasmore-self-transition'>): void {
    const { expected, input } = scenarioCase;
    const paginator = TrackingPaginator.create();
    PaginatorRunners.applyNumberPages(paginator, input.paginator.pages, input.paginator.nextCursors);
    assert.equal(paginator.transitions.length, expected.transitions);
    assert.equal(paginator.enters.length, expected.enters);
    assert.equal(paginator.exits.length, expected.exits);
  }

  static 'reentrancy-cross-instance'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'reentrancy-cross-instance'>): void {
    const { expected, input } = scenarioCase;
    const target = CrossInstanceReentrantPaginator.create();
    const source = CrossInstanceReentrantPaginator.create();
    target.configure(input.paginator.targetName);
    source.configure(input.paginator.sourceName, target);
    source.next(PaginatorRunners.itemAt(input.paginator.pages, 0), PaginatorRunners.numberCursor(input.paginator.nextCursor));
    assert.deepEqual(source.pages, expected.sourcePages);
    assert.deepEqual(target.pages, expected.targetPages);
    assert.deepEqual(source.enters, expected.sourceEnters);
    assert.deepEqual(target.enters, expected.targetEnters);
  }

  static 'reentrancy-next'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'reentrancy-next'>): void {
    const { expected, input } = scenarioCase;
    const paginator = ReentrantNextPaginator.create();
    const { nextCursors, pages } = input.paginator;
    paginator.next(PaginatorRunners.itemAt(pages, 0), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(nextCursors, 0)));
    assert.deepEqual(paginator.pages, pages.slice(0, 2));
    assert.equal(paginator.hasNext(), expected.hasNext);
    paginator.next(PaginatorRunners.itemAt(pages, 2), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(nextCursors, 2)));
    assert.deepEqual(paginator.pages, expected.pages);
  }

  static 'reentrancy-reset'(scenarioCase: ScenarioCaseOfType<PaginatorScenarioCaseEntity.Type, 'reentrancy-reset'>): void {
    const { expected, input } = scenarioCase;
    const paginator = ReentrantResetPaginator.create();
    paginator.next(PaginatorRunners.itemAt(input.paginator.pages, 0), PaginatorRunners.numberCursor(input.paginator.nextCursor));
    assert.deepEqual(paginator.pages, expected.pages);
    assert.equal(paginator.hasNext(), expected.hasNext);
    assert.equal(paginator.enterCount, expected.enterCount, 'same-instance nested hook dispatch is stopped by reentrancy detection');
  }

  static declaresUncloneablePage(): void {
    void it('surfaces an uncloneable page as a PaginatorCloneError carrying the platform error', () => {
      const paginator = Paginator.create<unknown, string>();

      assert.throws(() => { paginator.next(() => { return undefined; }, { 'cursor': 'c', 'exhausted': false }); }, (caught) => {
        const thrown: unknown = caught;
        assert.ok(thrown instanceof PaginatorCloneError);
        assert.equal(thrown.code, 'paginator.valueNotCloneable');
        assert.ok(thrown.cause instanceof Error);
        return true;
      });
    });
  }

  private static applyNumberPages(
    paginator: Paginator<string, number>,
    pages: readonly string[],
    cursors: readonly { readonly 'cursor'?: number; readonly 'exhausted': boolean }[]
  ): void {
    for (let index = 0; index < pages.length; index += 1) {
      paginator.next(PaginatorRunners.itemAt(pages, index), PaginatorRunners.numberCursor(PaginatorRunners.itemAt(cursors, index)));
    }
  }

  private static copyNamedItemsPage(page: { readonly 'items': readonly { readonly 'name': string }[] }): PaginatorNamedItemsPageEntity.Type {
    const copy: PaginatorNamedItemsPageEntity.Type = { 'items': [] };
    for (let index = 0; index < page.items.length; index += 1) {
      copy.items.push({ 'name': PaginatorRunners.itemAt(page.items, index).name });
    }
    return copy;
  }

  /** The base `onTransition` hook is typed `void`, so the asynchronous recorder is installed on the instance. */
  private static installTransitionRecorder(paginator: AsyncOwnedPaginator): void {
    Object.defineProperty(paginator, 'onTransition', {
      'value': (
        _from: PaginatorIdleStateEntity.Type
        | PaginatorHasMoreStateInterface<string, number>
        | PaginatorExhaustedStateInterface<string>,
        to: PaginatorIdleStateEntity.Type
        | PaginatorHasMoreStateInterface<string, number>
        | PaginatorExhaustedStateInterface<string>
      ): Promise<void> => {
        const settled = paginator.recordTransition(to.variant);
        return settled;
      }
    });
  }

  private static itemAt<T>(values: readonly T[], index: number): T {
    const value = values[index];
    if (value === undefined) {
      throw RuntimeError.create(`Expected item at index ${String(index)}`);
    }
    return value;
  }

  private static numberCursor(
    value: { readonly 'cursor'?: number; readonly 'exhausted': boolean }
  ): PaginatorAvailableCursorInterface<number> | PaginatorExhaustedCursorEntity.Type {
    if (value.exhausted) {
      return { 'exhausted': true };
    }

    return { 'cursor': ScenarioValues.requireNumber(value.cursor, 'cursor'), 'exhausted': false };
  }

  /** The fixture encodes an absent cursor as `{ shape: 'undefined' }`, since JSON has no `undefined` literal. */
  private static optionalStringCursor(
    value: { readonly 'cursor': string | { readonly 'shape': 'undefined' }; readonly 'exhausted': boolean }
  ): PaginatorAvailableCursorInterface<string | undefined> | PaginatorExhaustedCursorEntity.Type {
    if (value.exhausted) {
      return { 'exhausted': true };
    }

    return { 'cursor': typeof value.cursor === 'string' ? value.cursor : undefined, 'exhausted': false };
  }
}

ScenarioSuite.register({
  'entity': PaginatorScenarioCaseEntity,
  'extraTests': PaginatorRunners.declaresUncloneablePage,
  'file': scenarioGroups,
  'name': 'Paginator',
  'runners': PaginatorRunners
});
