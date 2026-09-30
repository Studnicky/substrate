import type { JsonValueEntity } from '@studnicky/json/entities';

import type { UntypedDispatcherFactoryInterface } from './interfaces/UntypedDispatcherFactoryInterface.js';

import { UndiciDispatcher } from '../../src/node/index.js';

/** Builds an `UndiciDispatcher` from an agent the library's own types would reject, so a test can prove the runtime validation. */
export class InvalidDispatcherFactory {
  static create(agent: JsonValueEntity.Type | object): UndiciDispatcher {
    const factory: UntypedDispatcherFactoryInterface = UndiciDispatcher;
    const dispatcher = factory.create(agent);
    return dispatcher;
  }
}
