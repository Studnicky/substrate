import type { DispatcherConfigEntity } from '../../src/entities/DispatcherConfigEntity.js';

import { TestDispatcher } from '../../src/testing/TestDispatcher.js';

/** A `TestDispatcher` destroyed when the `await using` scope ends. */
export class ScopedTestDispatcher implements AsyncDisposable {
  readonly dispatcher: TestDispatcher;

  private constructor(dispatcher: TestDispatcher) {
    this.dispatcher = dispatcher;
  }

  static create(config: DispatcherConfigEntity.InputType): ScopedTestDispatcher {
    const scoped = new ScopedTestDispatcher(TestDispatcher.create(config));
    return scoped;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispatcher.destroy();
  }
}
