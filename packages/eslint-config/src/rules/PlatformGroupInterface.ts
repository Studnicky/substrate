import type { PlatformCallEntity } from './PlatformCallEntity.js';

/** Platform APIs sharing a usage kind, owners, and literal-argument policy. */
export interface PlatformGroupInterface {
  readonly 'kind': PlatformCallEntity.Type['kind'];
  readonly 'members': readonly string[];
  readonly 'owners': readonly string[];
  readonly 'safeWhenLiteral': PlatformCallEntity.Type['safeWhenLiteral'];
}
