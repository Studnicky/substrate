import type { PropertyOrderEntity } from '../entities/PropertyOrderEntity.js';
import type { AnalysisResultInterface } from './AnalysisResultInterface.js';

/** Analysis the DrillDown engine uses to choose an automatic grouping order. */
export interface DrillDownAnalysisInterface extends AnalysisResultInterface {
  'selectedGrouping': PropertyOrderEntity.Type
}
