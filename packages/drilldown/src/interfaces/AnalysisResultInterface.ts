import type { PropertyOrderEntity } from '../entities/PropertyOrderEntity.js';
import type { PropertyInfoInterface } from './PropertyInfoInterface.js';

/** Complete analysis output for a dataset. Carries a runtime Map, not schema data. */
export interface AnalysisResultInterface {
  'properties': Map<string, PropertyInfoInterface>
  'recommendedGrouping': PropertyOrderEntity.Type
  'totalRecords': number
}
