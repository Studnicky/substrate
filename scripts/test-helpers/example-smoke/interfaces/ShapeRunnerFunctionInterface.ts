import type { ExampleScenarioEntity } from '../entities/ExampleScenarioEntity.js';
import type { ExampleSmokeContextInterface } from './ExampleSmokeContextInterface.js';

export interface ShapeRunnerFunctionInterface {
  (scenario: ExampleScenarioEntity.Type, context: ExampleSmokeContextInterface): void | Promise<void>;
}
