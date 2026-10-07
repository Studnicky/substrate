import type { CpuSnapshotEntity } from '../entities/CpuSnapshotEntity.js';
import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';

export interface SystemProviderInterface {
  arch(): string;
  cpuInfo(): CpuSnapshotEntity.Type;
  cpuModel(): string;
  detectGpu(): GpuInfoEntity.Type | null;
  freeMb(): number;
  logicalCpuCount(): number;
  physicalCpuCount(): number;
  platform(): string;
  runtimeVersion(): string;
  totalMb(): number;
}
