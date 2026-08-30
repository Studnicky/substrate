import type { RequestScopeInterface } from './RequestScopeInterface.js';

/** Creates an isolated scope for one request execution. */
export interface RequestScopeFactoryInterface {
  initialize(initial?: Record<string, unknown>): RequestScopeInterface;
}
