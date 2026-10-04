import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';

export class GrowLogBuffer<T> extends CircularBuffer<T> {
  readonly growLog: { 'newCapacity': number; 'oldCapacity': number; }[] = [];

  override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growLog.push({ 'newCapacity': newCapacity, 'oldCapacity': oldCapacity });
  }
}
