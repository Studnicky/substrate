import type { DraftNodeStateEntity } from '../entities/DraftNodeStateEntity.js';

/** Internal copy-on-write state for one draftable object or array. */
export interface DraftNodeInterface<T extends object = object> extends Record<'base', T> {
  'children': Map<PropertyKey, DraftNodeInterface>;
  'copy': T | undefined;
  'isArray': DraftNodeStateEntity.Type['isArray'];
  'proxies': Map<PropertyKey, object>;
}
