import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';

export class PushCountBuffer<T> extends CircularBuffer<T> {
  pushCount = 0;

  override onPush(_item: T): void {
    this.pushCount += 1;
  }
}
