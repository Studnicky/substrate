import { FsmError } from './errors/FsmError.js';

export class MachineAlreadyRegisteredError extends FsmError {
  public override readonly name: string = 'MachineAlreadyRegisteredError';

  readonly machineId: string;

  constructor(machineId: string) {
    super({ 'code': 'fsm.machineAlreadyRegistered', 'message': `Machine '${machineId}' is already registered` });
    this.machineId = machineId;
  }
}
