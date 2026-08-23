import type { DraftNodeStateEntity } from '../entities/DraftNodeStateEntity.js';
import type { JsonValueEntity } from '../entities/JsonValueEntity.js';

/** Internal copy-on-write state for one draftable object or array. */
export interface DraftNodeInterface {
  'base': JsonValueEntity.Type;
  'children': Map<PropertyKey, DraftNodeInterface>;
  'copy': Record<PropertyKey, JsonValueEntity.Type> | JsonValueEntity.Type[] | undefined;
  'isArray': DraftNodeStateEntity.Type['isArray'];
  'proxies': Map<PropertyKey, object>;
}
