import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';

export interface SystemProviderInterface {
  arch(): string;
  cpuInfo(): { 'logicalCount': number; 'model': string; 'physicalCount': number };
  cpuModel(): string;
  detectGpu(): GpuInfoEntity.Type | null;
  freeMb(): number;
  logicalCpuCount(): number;
  physicalCpuCount(): number;
  platform(): string;
  runtimeVersion(): string;
  totalMb(): number;
}
