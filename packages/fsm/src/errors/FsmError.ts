import { BaseError } from '@studnicky/errors';

/**
 * Abstract package-level error ancestor for all FSM errors.
 * Every error thrown by `@studnicky/fsm` extends this class.
 */
export abstract class FsmError extends BaseError {}
