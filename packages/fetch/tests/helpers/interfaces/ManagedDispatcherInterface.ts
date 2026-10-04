import type { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';
import type { UndiciDispatcher } from '../../../src/node/index.js';

/** A dispatcher agent paired with the `UndiciDispatcher` that wraps it. */
export interface ManagedDispatcherInterface {
  readonly 'agent': ReturnType<typeof DispatcherAgent.create>;
  readonly 'dispatcher': UndiciDispatcher;
}
