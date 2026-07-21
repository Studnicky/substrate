import type { DraftNodeStateEntity } from '../entities/DraftNodeStateEntity.js';

/** Internal copy-on-write state for one draftable object or array. */
export interface DraftNodeInterface {
  'base': unknown;
  'children': Map<PropertyKey, DraftNodeInterface>;
  'copy': Record<PropertyKey, unknown> | unknown[] | undefined;
  'isArray': DraftNodeStateEntity.Type['isArray'];
  'proxies': Map<PropertyKey, unknown>;
}
