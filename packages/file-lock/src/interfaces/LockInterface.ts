/** Portable exclusive-lock lifecycle contract. */
export interface LockInterface {
  'release': () => void;
}
