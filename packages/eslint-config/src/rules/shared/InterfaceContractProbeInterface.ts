import type { InterfaceContractEvidenceInterface } from './InterfaceContractEvidenceInterface.js';

export interface InterfaceContractProbeInterface {
  readonly 'matched': boolean;
  readonly 'value': InterfaceContractEvidenceInterface | undefined;
}
