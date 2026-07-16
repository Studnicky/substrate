import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';

export interface SystemProviderInterface {
  arch(): string;
  cpuModel(): string;
  detectGpu(): GpuInfoEntity.Type | null;
  freeMb(): number;
  logicalCpuCount(): number;
  platform(): string;
  runtimeVersion(): string;
  totalMb(): number;
}
