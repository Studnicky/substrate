/**
 * @studnicky/pipeline
 * Generic typed async pipeline for sequential context transforms
 */

export { PipelineOptionsEntity } from './entities/PipelineOptionsEntity.js';
export { PipelineError } from './errors/index.js';
export type { PipelineInterface } from './interfaces/PipelineInterface.js';

export { Pipeline } from './pipeline/Pipeline.js';
export { PipelineBuilder } from './pipeline/PipelineBuilder.js';
export type { PipelineFnType } from './types/PipelineFnType.js';
