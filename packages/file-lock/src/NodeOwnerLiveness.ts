import { Predicates } from '@studnicky/types';

import type { OwnerLivenessInterface } from './interfaces/OwnerLivenessInterface.js';

export class NodeOwnerLiveness implements OwnerLivenessInterface {
  /** A reused PID is treated as live, conservatively requiring explicit recovery review. */
  public isAlive(ownerToken: string): boolean {
    const processId = Number(ownerToken);
    if (!Predicates.isPositiveInteger(processId)) {
      return false;
    }
    try {
      process.kill(processId, 0);
      return true;
    } catch (error) {
      if (Predicates.isObject(error) && error.code === 'ESRCH') {
        return false;
      }
      if (Predicates.isObject(error) && error.code === 'EPERM') {
        return true;
      }
      throw error;
    }
  }
}
