import type { JsonValueEntity } from '@studnicky/json/entities';

import type { UndiciDispatcher } from '../../../src/node/index.js';

/** An `UndiciDispatcher` factory whose `create` accepts any object, for feeding a deliberately invalid agent to the real factory. */
export interface UntypedDispatcherFactoryInterface {
  create(agent: JsonValueEntity.Type | object): UndiciDispatcher;
}
