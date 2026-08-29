import type { OwnerLivenessInterface } from '../interfaces/OwnerLivenessInterface.js';

export class NodeOwnerLiveness implements OwnerLivenessInterface {
  public isAlive(_ownerToken: string): boolean {
    return false;
  }
}
