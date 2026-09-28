import { DrilldownRulesEntity } from './DrilldownRulesEntity.js';

/** Registers `DrilldownRulesEntity.Schema` under its own `$id`, for every group-value variant's `rules` field to resolve by absolute `$ref` through `remoteSchemas`. One map, shared, not rebuilt per variant. */
export const drilldownRulesRemoteSchemas = new Map<string, object | boolean>([[DrilldownRulesEntity.Schema.$id, DrilldownRulesEntity.Schema]]);
