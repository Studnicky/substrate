import type { JsonPropertyTypeEntity } from '../entities/JsonPropertyTypeEntity.js';
import type { PropertyBoundsEntity } from '../entities/PropertyBoundsEntity.js';

/** Statistical profile of a single property across all records. Carries a runtime Map, not schema data. */
export interface PropertyInfoInterface {
  'bounds'?: PropertyBoundsEntity.Type
  'cardinality': number
  'coverage': number
  'distribution'?: Map<string, number>
  'name': string
  'nullCount': number
  'type': JsonPropertyTypeEntity.Type
}
